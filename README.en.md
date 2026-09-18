# dsh-better-display

[中文](./README.md)

Adds a **阅读** tab to DeepSeek Harness. While a turn runs you see steps, thinking, and progress. After a successful turn those collapse and the final answer stays. Native Chat / Trajectory, the composer, model picker, tools, and approvals stay.

A ````mcp-app` fence in the final answer mounts as an interactive card in the reading view, inside `<iframe sandbox="allow-scripts allow-forms">` without `allow-same-origin`. The card can fill the next prompt via JSON-RPC. The skill pack is [`skills/generative-mcpapps/`](skills/generative-mcpapps/).

v0.2.1. Display only. It does not change Agent execution, the SDK, or credentials. Node.js `^22.19.0 || >=24`.

## Install

Needs a working DeepSeek Harness. The plugin itself does not need a Harness source checkout.

```sh
git clone https://github.com/aa2246740/dsh-better-display.git /path/to/dsh-better-display
cd /path/to/dsh-better-display

npm install
npm test
npm run build
```

Then link that directory into the DSH web profile — through the DSH plugin manager, or:

```sh
dsh plugin --profile web add /path/to/dsh-better-display
```

First install does not restart DSH. Reload the Web page and pick 阅读. New sessions default to reading.

To update:

```sh
git pull
npm run build
```

Then reload the browser.

### Developing inside a Harness checkout (optional)

If you also maintain the DeepSeek Harness source, the `dshx` flow still works and adds the official bundle-purity check:

```sh
export DSHX_HARNESS=/absolute/path/to/deepseek-harness
node scripts/link-harness-dependencies.mjs "$DSHX_HARNESS"
npm test
DSHX_HARNESS="$DSHX_HARNESS" npx tsdown   # uses the repo-root tsdown.config.ts
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

## License

Display and Markdown pieces come from DeepSeek Harness (MIT). Motion is based on [Transitions.dev](https://transitions.dev/). This repo is [MIT](LICENSE).
