# dsh-better-display

[中文](./README.md)

Prefer npm (version-pinable):

```sh
dsh plugin --profile web add dsh-better-display@0.5.0
```

Or latest:

```sh
dsh plugin --profile web add dsh-better-display
```

Fallback: install from GitHub (tracks the default branch tip):

```sh
dsh plugin --profile web add github:aa2246740/dsh-better-display
```

You need official `dsh` (or `npx @deepseek-ai/dsh`) and **pnpm** on PATH. `dsh plugin add` runs pnpm in `$DSH_HOME/profiles/web`. This repo commits built `lib/`, so git / npm installs do not need `prepare` or a profile `allowBuilds` entry.

Then restart that Host and reload the page. `dsh plugin add` writes the profile. It does not hot-load a running process.

Adds a **阅读** tab to DeepSeek Harness. While a turn runs you see steps, thinking, and progress. After a successful turn those collapse and the final answer stays. Native Chat / Trajectory, the composer, model picker, tools, and approvals stay. The reading column keeps ChatView's `data-chat-flow` hook so third-party skins that gate the composer on that mark still treat Reader as an interactive conversation.

Live turns **fold as they run**: process rows collapse into one counted summary line with a choreographed shrink, and that summary stays expandable after the turn closes. While an answer or confirmation is pending, the status line counts up from the latest human input; user messages and turn ends carry a local clock and duration.

Tool calls that changed files carry `+A -R` statistics and open a per-file diff panel, and third-party tool cards registered in the host's `tool.call.toolview` slot render inside the reading view. Settings → **Better Display** also holds the translucent frosted glass toggle and a three-stop auto-fold intensity.

"Show in folder" on a deliverable chip follows **the Host's own answer**: Finder or Explorer on macOS and Windows, the containing directory on a desktop Linux, a folder pane in the right Sidebar on a Host with no desktop (a NAS), and the NAS file manager itself once you fill in its URL template in Settings. When none of those can work, the absolute folder path is copied and the chip says so instead of pretending.

A ````mcp-app` fence in the final answer mounts as an interactive card in the reading view, inside `<iframe sandbox="allow-scripts allow-forms">` without `allow-same-origin`. The card can fill the next prompt via JSON-RPC. The skill pack is [`skills/generative-mcpapps/`](skills/generative-mcpapps/). Settings → **Better Display** can preview deliverables in the right Sidebar (system app remains the default), turn on translucent frosted glass (off by default), toggle process auto-folding (On is the default), and reports whether that skill is installed in a harness skill root.

Targets DeepSeek Harness **0.1.6-alpha.2**. Display only. It does not change Agent execution, the SDK, or credentials. Node.js `^22.19.0 || >=24`. New sessions default to reading.

From a local checkout or tarball:

```sh
dsh plugin --profile web add ./dsh-better-display
dsh plugin --profile web add ./dsh-better-display-0.5.0.tgz
```

`dsh.bundle` is captured at Host boot. Do not also insert the same row by hand in the profile `cordis.patch.yml`, or it will mount twice.

```sh
dsh plugin --profile web remove dsh-better-display
```

## Develop

```sh
npm test
npm run typecheck
npm run build
```

`npm run build` runs two steps: `tsc` emits `lib/types/` (types and the Host-half ESM) and
[`scripts/tsdown.standalone.config.mjs`](scripts/tsdown.standalone.config.mjs) emits
`lib/dsh-better-display.js` (Host half) plus `lib/client.js` (browser half).

That standalone build needs neither a Harness source checkout nor `lightningcss`. It reproduces
the official `client-build.mjs` contract: the browser half is a lazy-CJS bundle registered through
`window.__ModuleLoader__.load({ id, factory })`, and every module the Web shell already seeds
(`staticModules`: react, `@deepseek-ai/dsh-client-store`, `dsh-client-ui-slots`,
`dsh-client-ui-primitives`, …) or that `package.json` declares in `dsh.client.inject` stays
external and is never inlined — React, the slot registry, and the store engine must remain
single-instance.

### Developing inside a Harness checkout (optional)

If you also maintain the DeepSeek Harness source, the `dshx` flow still works and adds the official bundle-purity check:

```sh
export DSHX_HARNESS=/absolute/path/to/deepseek-harness
node scripts/link-harness-dependencies.mjs "$DSHX_HARNESS"
npm test
DSHX_HARNESS="$DSHX_HARNESS" npx tsdown   # uses the repo-root tsdown.config.ts
```

## License

Display and Markdown pieces come from DeepSeek Harness (MIT). Motion is based on [Transitions.dev](https://transitions.dev/). This repo is [MIT](LICENSE).
