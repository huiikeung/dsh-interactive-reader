# dsh-better-display

[English](./README.en.md)

给 DeepSeek Harness 加一个 **阅读** 页签：执行时能看到步骤、思考和进度；整轮成功结束后把过程收起来，留下最终回答。原版「对话 / 轨迹」、输入框、模型选择、工具和审批都还在。

最终回答里的 ````mcp-app` 代码块会在阅读视图里挂成交互卡片，跑在 `<iframe sandbox="allow-scripts allow-forms">` 里，没有 `allow-same-origin`。卡片可以通过 JSON-RPC 把下一轮 prompt 填进输入框。技能包在 [`skills/generative-mcpapps/`](skills/generative-mcpapps/)。

v0.2.1。只改展示，不改 Agent 执行、SDK 或模型凭据。Node.js `^22.19.0 || >=24`。

## 安装

需要一个能用的 DeepSeek Harness。插件本身不要求 Harness 源码检出。

```sh
git clone https://github.com/aa2246740/dsh-better-display.git /path/to/dsh-better-display
cd /path/to/dsh-better-display

npm install
npm test
npm run build
```

接着把该目录链接进 DSH 的 web profile：用 DSH 界面里的插件管理，或者

```sh
dsh plugin --profile web add /path/to/dsh-better-display
```

首次安装不用重启 DSH。刷新或重开 Web 页面后选「阅读」。新会话默认进阅读。

更新已有安装：

```sh
git pull
npm run build
```

然后刷新浏览器。

### 在 Harness 检出里开发（可选）

如果同时维护 DeepSeek Harness 源码，可以继续走 `dshx` 流程，它会额外跑一遍官方 bundle 纯净度校验：

```sh
export DSHX_HARNESS=/absolute/path/to/deepseek-harness
node scripts/link-harness-dependencies.mjs "$DSHX_HARNESS"
npm test
DSHX_HARNESS="$DSHX_HARNESS" npx tsdown   # 用仓库根的 tsdown.config.ts
```

## 开发

```sh
npm test
npm run typecheck
npm run build
```

`npm run build` 分两步：`tsc` 产出 `lib/types/`（类型与 Host 半边的 ESM），
[`scripts/tsdown.standalone.config.mjs`](scripts/tsdown.standalone.config.mjs) 产出
`lib/dsh-better-display.js`（Host 半边）和 `lib/client.js`（浏览器半边）。

这个独立构建不依赖 Harness 源码检出，也不依赖 `lightningcss`。它复刻官方
`client-build.mjs` 的约定：浏览器半边是 `window.__ModuleLoader__.load({ id, factory })`
注册的 lazy-CJS bundle；Web shell 已经作为 `staticModules` 提供的模块（react、
`@deepseek-ai/dsh-client-store`、`dsh-client-ui-slots`、`dsh-client-ui-primitives` …）
和 package.json 里 `dsh.client.inject` 声明的模块一律保持 external，绝不内联——
React、slot 注册表和 store 引擎必须全站单例。

## 许可

展示与 Markdown 部分来自 DeepSeek Harness（MIT）。动效参考 [Transitions.dev](https://transitions.dev/)。本仓库代码 [MIT](LICENSE)。
