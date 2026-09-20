# dsh-better-display

[English](./README.en.md)

推荐用 npm（可钉版本）：

```sh
dsh plugin --profile web add dsh-better-display@0.5.0
```

也可以装 latest：

```sh
dsh plugin --profile web add dsh-better-display
```

备选：从 GitHub 直装（跟默认分支最新提交）：

```sh
dsh plugin --profile web add github:aa2246740/dsh-better-display
```

PATH 上要有官方 `dsh`（没有就用 `npx @deepseek-ai/dsh`）和 **pnpm**。`dsh plugin add` 会在 `$DSH_HOME/profiles/web` 里跑 pnpm。仓库已提交编译好的 `lib/`，git / npm 安装都不用 `prepare`，也不用改 profile 的 `allowBuilds`。

然后重启这个 Host，再刷新页面。`dsh plugin add` 只写 profile，不会热挂正在跑的进程。

给 DeepSeek Harness 加一个 **阅读** 页签：执行时能看到步骤、思考和进度；整轮成功结束后把过程收起来，留下最终回答。原版「对话 / 轨迹」、输入框、模型选择、工具和审批都还在。阅读列保留宿主 ChatView 的 `data-chat-flow` 钩子，依赖该标记显示输入框的第三方皮肤不会把阅读页当成仅检视视图。

执行中过程会**实时折叠**成一行摘要并带计数，轮次结束后摘要仍可展开回看；正在等待你回答或确认时，状态行显示自最近一次输入起的等待计时；用户消息与轮次结束都有本地时间和耗时。

工具过程里改过文件的调用会带上 `+A -R` 统计，点开是每个文件一个页签的差异面板；注册在宿主 `tool.call.toolview` 槽位里的第三方工具卡片也会直接渲染在阅读页。设置里的 **Better Display** 还有半透明毛玻璃与三档自动折叠强度。

产物芯片上的「在文件夹中显示」按**宿主自己的回答**走：macOS / Windows 用访达 / 资源管理器定位，有桌面的 Linux 打开所在目录；没有桌面的宿主（比如 NAS）会在右侧栏打开一个目录面板；在设置里填上 fnOS 文件管理器地址模板后直接跳到 NAS 文件管理器；以上都不可用时复制目录的绝对路径并如实说明，不会再假装成功。

最终回答里的 ````mcp-app` 代码块会在阅读视图里挂成交互卡片，跑在 `<iframe sandbox="allow-scripts allow-forms">` 里，没有 `allow-same-origin`。卡片可以通过 JSON-RPC 把下一轮 prompt 填进输入框。技能包在 [`skills/generative-mcpapps/`](skills/generative-mcpapps/)。设置里的 **Better Display** 可把产物改为右侧栏预览（默认仍用系统应用），打开半透明毛玻璃（默认关），设置过程自动折叠开关（默认开），并检测该技能是否已装进宿主技能目录。

面向 DeepSeek Harness **0.1.6-alpha.2**。只改展示，不改 Agent 执行、SDK 或模型凭据。Node.js `^22.19.0 || >=24`。新会话默认进阅读。

本地目录或 tarball：

```sh
dsh plugin --profile web add ./dsh-better-display
dsh plugin --profile web add ./dsh-better-display-0.5.0.tgz
```

`dsh.bundle` 是开机捕获的。不要再往 profile 的 `cordis.patch.yml` 手写同一条 insert，会重复挂载。

```sh
dsh plugin --profile web remove dsh-better-display
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

### 在 Harness 检出里开发（可选）

如果同时维护 DeepSeek Harness 源码，可以继续走 `dshx` 流程，它会额外跑一遍官方 bundle 纯净度校验：

```sh
export DSHX_HARNESS=/absolute/path/to/deepseek-harness
node scripts/link-harness-dependencies.mjs "$DSHX_HARNESS"
npm test
DSHX_HARNESS="$DSHX_HARNESS" npx tsdown   # 用仓库根的 tsdown.config.ts
```

## 许可

展示与 Markdown 部分来自 DeepSeek Harness（MIT）。动效参考 [Transitions.dev](https://transitions.dev/)。本仓库代码 [MIT](LICENSE)。
