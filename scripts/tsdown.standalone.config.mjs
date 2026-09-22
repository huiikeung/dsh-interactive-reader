import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Checkout-free client-bundle build for an out-of-tree DSH plugin.
 *
 * DSH's own `client-build.mjs` preset needs a full DeepSeek Harness source
 * checkout (it reads `packages/client/web/src/platform.ts`) plus `lightningcss`.
 * A plugin installed into a profile only has the published runtime, so this
 * preset reproduces the same contract for the current DSH line:
 *
 *   * the browser half is a lazy-CJS bundle registered through
 *     `window.__ModuleLoader__.load({ id, factory })`;
 *   * every module the Vite shell seeds (`staticModules`) or that the package
 *     declares in `dsh.client.inject` / `dsh.client.external` stays external and
 *     is resolved by the shell's module system at materialization time — never
 *     inlined, because React, the slot registry and the store engine must stay
 *     single-instance;
 *   * `*.module.css` becomes a hashed class-name map plus one injected `<style>`
 *     tag owned by the plugin, so the bundle carries its own styles.
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const packageId = packageJson.name

/** Modules the DSH Web shell bundles into its `staticModules` seed (0.1.6-alpha.2). */
const SHELL_SEED_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const declaredInjections = packageJson.dsh?.client?.inject ?? []
const declaredExternals = packageJson.dsh?.client?.external ?? []
const externals = [...new Set([...SHELL_SEED_MODULES, ...declaredInjections, ...declaredExternals])]
const isExternal = specifier => externals.some(name => specifier === name || specifier.startsWith(`${name}/`))

const CSS_MODULE_PREFIX = '\0dsh-plugin-css-module:'
const VIRTUAL_SUFFIX = '.mjs'

/**
 * Deterministic 6-character class-name hash for one stylesheet.
 * A leading letter keeps the generated ident valid wherever it appears.
 * @param path - stylesheet path.
 * @returns the hash prefix.
 */
function styleHash(path) {
  const digest = createHash('sha256').update(relative(packageRoot, path)).digest()
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let hash = ''
  for (const byte of digest) {
    if (hash.length === 6) break
    hash += alphabet[byte % alphabet.length]
  }
  return /^[A-Za-z]/.test(hash) ? hash : `d${hash.slice(1)}`
}

/** Index just past a quoted CSS string that starts at `start`. */
function endOfString(text, start) {
  const quote = text[start]
  let cursor = start + 1
  while (cursor < text.length) {
    if (text[cursor] === '\\') cursor += 2
    else if (text[cursor] === quote) return cursor + 1
    else cursor += 1
  }
  return text.length
}

/** Index just past a `/* ... *​/` comment that starts at `start`. */
function endOfComment(text, start) {
  const end = text.indexOf('*/', start + 2)
  return end === -1 ? text.length : end + 2
}

/** Index of the `)` closing the group that opens at `start` (a `(`). */
function endOfGroup(text, start) {
  let nesting = 0
  let cursor = start
  while (cursor < text.length) {
    const char = text[cursor]
    if (char === '"' || char === "'") cursor = endOfString(text, cursor)
    else if (text.startsWith('/*', cursor)) cursor = endOfComment(text, cursor)
    else {
      if (char === '(') nesting += 1
      else if (char === ')') {
        nesting -= 1
        if (nesting === 0) return cursor
      }
      cursor += 1
    }
  }
  return -1
}

/**
 * Scope one stylesheet's local class selectors.
 *
 * Only rule preludes are rewritten; declaration blocks are copied verbatim, so
 * values such as `animation: markBusyPulse 1s` keep their global names.
 * Keyframes stay global by design: the sources name every `@keyframes`
 * uniquely, so scoping them would only add a rename to keep in sync with each
 * `animation` reference. `:global(...)` is unwrapped without renaming; its
 * inner selector stays as written.
 *
 * @param source - raw stylesheet text.
 * @param hash - class-name prefix for this stylesheet.
 * @returns the scoped CSS and its `local -> emitted` class map.
 */
function scopeCssModules(source, hash) {
  const classMap = {}
  const rename = local => (classMap[local] ??= `${hash}_${local}`)

  const rewriteSelector = selector => {
    let result = ''
    let cursor = 0
    while (cursor < selector.length) {
      const char = selector[cursor]
      if (char === '"' || char === "'") {
        const end = endOfString(selector, cursor)
        result += selector.slice(cursor, end)
        cursor = end
        continue
      }
      if (selector.startsWith('/*', cursor)) {
        const end = endOfComment(selector, cursor)
        result += selector.slice(cursor, end)
        cursor = end
        continue
      }
      if (selector.startsWith(':global(', cursor)) {
        const end = endOfGroup(selector, cursor + 7)
        if (end === -1) {
          result += selector.slice(cursor)
          break
        }
        result += selector.slice(cursor + 8, end)
        cursor = end + 1
        continue
      }
      if (selector.startsWith(':local(', cursor)) {
        const end = endOfGroup(selector, cursor + 6)
        if (end === -1) {
          result += selector.slice(cursor)
          break
        }
        result += rewriteSelector(selector.slice(cursor + 7, end))
        cursor = end + 1
        continue
      }
      const match = /^\.([A-Za-z_][A-Za-z0-9_-]*)/.exec(selector.slice(cursor))
      if (match !== null && selector[cursor - 1] !== '\\') {
        result += `.${rename(match[1])}`
        cursor += match[0].length
        continue
      }
      result += char
      cursor += 1
    }
    return result
  }

  const parse = start => {
    let out = ''
    let cursor = start
    while (cursor < source.length) {
      const char = source[cursor]
      if (char === '}') return { out, cursor }
      if (char === '"' || char === "'") {
        const end = endOfString(source, cursor)
        out += source.slice(cursor, end)
        cursor = end
        continue
      }
      if (source.startsWith('/*', cursor)) {
        const end = endOfComment(source, cursor)
        out += source.slice(cursor, end)
        cursor = end
        continue
      }
      if (char === ';') {
        out += char
        cursor += 1
        continue
      }
      let scan = cursor
      let nesting = 0
      while (scan < source.length) {
        const next = source[scan]
        if (next === '"' || next === "'") {
          scan = endOfString(source, scan)
          continue
        }
        if (source.startsWith('/*', scan)) {
          scan = endOfComment(source, scan)
          continue
        }
        if (next === '(') nesting += 1
        else if (next === ')') nesting -= 1
        else if (nesting === 0 && (next === '{' || next === ';' || next === '}')) break
        scan += 1
      }
      const prelude = source.slice(cursor, scan)
      if (scan >= source.length) {
        out += prelude
        return { out, cursor: scan }
      }
      const terminator = source[scan]
      if (terminator !== '{') {
        out += prelude + terminator
        cursor = scan + 1
        continue
      }
      // At-rules keep their own prelude; every other prelude is a selector list.
      out += (/^\s*@/.test(prelude) ? prelude : rewriteSelector(prelude)) + '{'
      const inner = parse(scan + 1)
      out += inner.out
      if (source[inner.cursor] === '}') {
        out += '}'
        cursor = inner.cursor + 1
      } else cursor = inner.cursor
    }
    return { out, cursor }
  }

  return { css: parse(0).out, classMap }
}

/**
 * Emit the lazy-CJS module for one scoped stylesheet.
 * @param path - stylesheet path.
 * @param css - scoped stylesheet text.
 * @param classMap - `local -> emitted` class map.
 * @returns the module source.
 */
function styleModule(path, css, classMap) {
  const tagId = `${packageId}/${relative(packageRoot, path)}`
  return [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(tagId)};`,
    "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {",
    "  const tag = document.createElement('style');",
    `  tag.dataset.plugin = ${JSON.stringify(packageId)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
    `export default ${JSON.stringify(classMap)};`,
  ].join('\n')
}

const cssModulesPlugin = {
  name: 'dsh-plugin-css-modules',
  resolveId(source, importer) {
    if (!source.endsWith('.module.css')) return null
    const path = importer === undefined ? resolve(packageRoot, source) : resolve(dirname(importer), source)
    return CSS_MODULE_PREFIX + path + VIRTUAL_SUFFIX
  },
  async load(virtualId) {
    if (!virtualId.startsWith(CSS_MODULE_PREFIX)) return null
    const path = virtualId.slice(CSS_MODULE_PREFIX.length, -VIRTUAL_SUFFIX.length)
    if (!existsSync(path)) throw new Error(`dsh-interactive-reader build: missing stylesheet ${path}`)
    this.addWatchFile(path)
    const { css, classMap } = scopeCssModules(await readFile(path, 'utf8'), styleHash(path))
    return styleModule(path, css, classMap)
  },
}

/**
 * Browser-safe DSH helpers the official preset inlines instead of resolving
 * through the shell. They are pure modules with no shared runtime identity.
 */
const INLINE_SAFE = /^@deepseek-ai\/dsh-(?:file-reference|session|llm|tools|brand|util-crypto|util-workspace-path)(?:\/|$)/

const purityPlugin = {
  name: 'dsh-client-bundle-purity',
  resolveId(source) {
    if (!source.startsWith('@deepseek-ai/')) return null
    if (isExternal(source) || INLINE_SAFE.test(source)) return null
    throw new Error(
      `DSH client bundle purity: ${JSON.stringify(source)} is neither a shell seed module nor a `
      + 'dsh.client.inject/external row; use a Cordis service, a type-only import, or declare the exact request',
    )
  },
}

/** Package-owned runtime dependencies that the Host half must not inline. */
const hostDependencies = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
])
const isHostDependency = specifier => [...hostDependencies]
  .some(name => specifier === name || specifier.startsWith(`${name}/`))

const clientConfig = {
  name: `${packageId}/client`,
  cwd: packageRoot,
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  plugins: [cssModulesPlugin, purityPlugin],
  // `neverBundle` keeps the shell seeds and declared injections external;
  // `alwaysBundle` overrides tsdown's default externalization of this package's
  // own dependencies (clsx, katex, the mdast/micromark chain), which the browser
  // module system has no row for and must therefore receive inline.
  deps: {
    neverBundle: specifier => isExternal(specifier),
    alwaysBundle: specifier => !isExternal(specifier),
  },
  define: {
    'process.env': '{}',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
  },
}

/** Host half: a plain ESM Node plugin, externalizing every declared dependency. */
const hostConfig = {
  name: packageId,
  cwd: packageRoot,
  entry: ['src/dsh-interactive-reader.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: specifier => isHostDependency(specifier),
    alwaysBundle: specifier => !isBuiltin(specifier) && !isHostDependency(specifier),
  },
}

export default [hostConfig, clientConfig]

