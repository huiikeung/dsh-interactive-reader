# dsh-better-display

适用于 DeepSeek Harness 的独立阅读视图插件。

执行期间按原始顺序展示思考、工具调用和进度；一轮成功完成后收起过程并保留最终回答。插件增加独立的「阅读」页签，不修改 Agent、SDK、提示词、模型设置或会话记录。

## 兼容性

- 插件版本：`0.2.0`
- DeepSeek Harness：`0.1.2-alpha.1`
- Node.js：`^22.19.0 || >=24`
- Web profile

本仓库包含预构建的 `lib/client.js`。普通安装不需要额外的开发套件，也不需要在本机重新构建。

## 安装

从 npm registry 安装已发布版本：

```sh
dsh plugin --profile web add dsh-better-display
```

从 GitHub SSH 仓库安装：

```sh
dsh plugin --profile web add git+ssh://git@github.com/huiikeung/dsh-better-display.git
```

从本地目录安装：

```sh
dsh plugin --profile web add /absolute/path/to/dsh-better-display
```

插件声明了标准 `dsh.bundle.patch`，`dsh plugin` 会把它加入 `web` profile。首次安装后重启当前 Web Host，再刷新或重新打开页面。页面中会出现「阅读」页签；在地址后添加 `?reader=1` 可进入阅读一次，新会话默认进入阅读。

卸载：

```sh
dsh plugin --profile web remove dsh-better-display
```

不要同时启用旧的 `dsh-reader` 试用插件，两者占用同一个阅读视图位置。

## 功能

- 思考、工具调用和中途说明保持原始顺序。
- 长思考以两行步进平滑跟随，滚动、聚焦或选字时暂停。
- 仅在一轮成功完成后自动收起过程；错误、中断和等待用户操作时保留过程。
- 保留 Markdown、代码、表格、公式、链接、图片及工具原始数据。
- 遵守系统的减少动态效果设置。
- 不执行模型生成的 HTML 或 JavaScript。

没有收到 reasoning 的消息不会补写或推测思考。插件不翻译、摘要或重新解释原始 Think 文本。

## 开发

开发构建需要一份完整、已安装依赖并完成 `build:lib` 的 DeepSeek Harness `0.1.2-alpha.1` checkout：

```sh
export DSH_HARNESS=/absolute/path/to/deepseek-harness
node scripts/link-harness-dependencies.mjs "$DSH_HARNESS"
npm test
npm run typecheck
npm run build
```

构建适配器位于本仓库的 `scripts/client-build.mjs`。它读取指定 Harness checkout 的客户端平台模块清单，以生成 DSH Web Loader 使用的 `lib/client.js`。

42 项单元测试覆盖顺序、轮次结束、异常保留、两行跟随、Unicode、Markdown 和流式缓冲。测试通过不等于插件已在真实页面加载，发布前仍需完成 Web profile 安装和浏览器验证。

`dsh-better-display.block` 是供受信任插件使用的 chain slot，公开 owner 类型为 `ReaderBlockOwner`。未知内容有安全兜底和独立错误边界。

## 许可

本项目使用 MIT License。原生展示与 Markdown 部分来自 DeepSeek Harness（MIT）。动效参考 Transitions.dev 的免费 Streaming text、Thinking states 和 Reasoning stream；第三方许可见 `THIRD_PARTY_NOTICES.md`。
