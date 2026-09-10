---
id: "4fffe36c-14ff-4c01-82d5-1cb8cb1ce445"
title: "dsh-better-display 适配 Harness 0.1.3：MessageText 移除的根因、迁移与重建流程"
description: "插件在 Host 0.1.3 上「发送内容」显示兜底提示的确证根因、projectUserText 迁移、slot augmentation 类型坑，以及本机 staging 重建流程"
status: "active"
created_at: "2026-09-08T03:56:04.073Z"
updated_at: "2026-09-08T03:56:04.073Z"
content_hash: "79d19e1b81ea03d1a78d11daa9394ba7c992c5b3e471d608afed6d48bcfaab8e"
source_paths:
  - "src/client/Blocks.tsx"
  - "src/client/Reader.tsx"
  - "src/client/Reader.module.css"
  - "src/client/projection.ts"
  - "src/client/types.ts"
  - "src/client/index.tsx"
  - "src/client/ToolActivity.tsx"
  - "tests/projection.test.ts"
  - "scripts/client-build.mjs"
  - "scripts/link-harness-dependencies.mjs"
  - "CHANGELOG.md"
  - "README.md"
  - "package.json"
session_ids:
  - "7dd960cd-e243-469d-875b-f46addf2709f"
memory_body_ids:
  []
---

# dsh-better-display × Harness 0.1.3：发送内容兜底提示的根因与迁移

工作对象：`/vol1/1000/Deepseek-Harness/项目/dsh-better-display`（DSH「阅读」视图插件，修复后版本 `0.3.15`）。

## 症状

阅读页里每条「发送内容」（用户消息）都显示：
> 此内容暂时无法在阅读页显示；原对话中的记录未受影响。

该文案来自插件自己的错误边界 `BlockBoundary`（`src/client/Blocks.tsx`），即渲染期抛错，而不是数据缺失。

## 根因（确证）

插件用 `MessageText`（`@deepseek-ai/dsh-client-ui-primitives`）渲染用户文本；本机安装的 Host 是 **0.1.3-alpha.1**，该包**删除了 `MessageText`**，改为函数 `projectUserText`。元素类型为 `undefined` → React 抛错 → 被边界兜住。

两条独立证据：

1. 从 Host 实际产物 `apps/web/dist/assets/index-eaoyilRb.js` 抽出 primitives 的 120 个导出符号，与插件 bundle 用到的 18 个逐一比对，**只有 `MessageText` 缺失**（`projectUserText`、`DocumentFileIcon`、`fileSizeText`、`DisclosureRow`、`JsonBlock`、各 Icon 均在）。
2. `tsc` 直接报 `src/client/Blocks.tsx(5,60): error TS2305: Module '"@deepseek-ai/dsh-client-ui-primitives"' has no exported member 'MessageText'.`

诊断不依赖用户截图（模型看不到图）：导出表 diff + 源码路径的证据强度高于看图。

## 新 API 与兼容写法

```ts
projectUserText(
  text: string,
  sessionLabels: readonly string[],   // 无默认值，内部 [...new Set(...)]，必须传数组
  slashNames: readonly string[] = [],
  slashKind: 'skill' | 'command' = 'skill',
): ReactNode
```

节点数据可取 `node.data.referenceLabels` / `node.data.skillNames`。插件的 `UserText` 用 `typeof projectUserText === 'function'` + try/catch 守卫，缺省时退回纯文本，因此对旧 Host（0.1.2-alpha.1）也安全。

## 顺带修掉的两个缺陷

- **`file` 附件**：原先落到 `{kind:'other'}` → 显示「此内容类型尚未接入阅读页」+ 原始 JSON。现按原生 `UserStyleBubble` 的做法：附件行在气泡**上方**，`file` 渲染成文件卡（`DocumentFileIcon` + 文件名 + 扩展名 + `fileSizeText`），多个 text 块 `join('')`，无文本时不出空气泡。
  原生参照（只读）：`packages/client/ui-chat/src/client/chat/MessageItem.tsx`、`.../chat/MessageItem.module.css`（`.attachmentRow`、`.fileCard` 240×64 / radius 16、`.bubble`）。
- **类型装载**：`import type {} from '@deepseek-ai/dsh-client-ui-*'` 会在解析前被擦除，Host 包贡献的 slot augmentation（`SessionStandardProps` 的 `useSession`/`sessionId`/`useProjection`）不进 program，`PropsRuntime<'conversation.view'>` 只剩一半。改为 `import type * as X from '...'` 并在类型位引用 `typeof X`（见 `src/client/types.ts`、`src/client/index.tsx`）。
  0.1.3 还把 slot `inject` 的首参改成普通 `string`（不再是 branded `SessionId`），并追加第二个 `actions` 参数。

## 重建流程（本机环境特殊）

用户 checkout `/vol1/@appdata/deepseek.harness/src/deepseek-harness` 被裁剪过（1042 个 deleted 文件，含 `packages/client/{ui-primitives,web,store,ui-slots}`），但 git blob 完整。**不要** `git checkout --` 恢复（会改动运行中 App 的源码树），改用只读抽取：

```sh
git archive HEAD <paths> | tar -x -C /tmp/dsh-better-display-host
```

staging 根复用旧路径 `/tmp/dsh-better-display-host`，使插件 `node_modules` 里遗留的符号链接语义一致。要点：

- `ui-primitives`：手写窄 `types.d.ts` shim（其 `lib/types` 随源码被裁剪），`package.json` exports 指向该文件。
- `store` / `ui-slots`：`types` 指向 `./src/index.ts`，并把 `from './x.ts'` 改写为 `'.x.js'`（NodeNext 下 `allowImportingTsExtensions` 与 emit 冲突）；需补装 `zustand@~4.4.7`、`immer@^10.1.1`；`store/src/index.ts` 顶部加 `/// <reference types="node" />`（用到 `process.env`）。
- `ui-chat` / `ui-conversation` / `ui-session` / `ui-renderer`：**实体拷贝**到 staging（不能 symlink 到 checkout）。否则这些包的 `declare module '@deepseek-ai/dsh-client-ui-slots'` 会从 checkout 的 `node_modules` 解析出**第二个 ui-slots 实例**，augmentation 落到空模块上、静默不合并——表现为 `useSession`/`sessionId` 神秘缺失。同时把 `$STAGE/node_modules/@deepseek-ai/*` 里这四个包重新指向 staging 拷贝。
- 构建工具链单独装在 `/tmp/dsh-build-deps/node_modules` 再 symlink 回来：`npm install` 装进插件目录会重解析 `@deepseek-ai/*` peer 而破坏符号链接。`npx` 因 npm cache EACCES 不可用，需 `--cache /tmp/npmcache`；`tsc` 用 `node node_modules/typescript/bin/tsc`。

```sh
cd /vol1/1000/Deepseek-Harness/项目/dsh-better-display
DSH_HARNESS=/tmp/dsh-better-display-host npm run build   # tsc -p tsconfig.json && tsdown
```

`scripts/client-build.mjs` 会读 `$DSH_HARNESS/packages/client/web/src/platform.ts`。0.1.3 的 `PLATFORM_MODULES` 已不含 ui-chat/conversation/renderer/session，但插件运行时只 `require` store + primitives，故无需新增 `dsh.client.external`；**每次构建后复核 bundle 的 require 列表仍为 4 项**（`react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives`）。

## 安装与生效

profile 里是 `link:` 依赖（`profiles/web/node_modules/dsh-better-display` → 工作区符号链接），所以 `npm run build` 后**无需重装插件**。`dsh web` 带鉴权（curl 根路径返回 401），无法从命令行验证线上产物；先刷新页面，若仍是旧提示则需重启 Host。

## 会话数据取证

`/vol1/@appdata/deepseek.harness/dsh-data/sessions/<proj>/<sid>/session.v2.jsonl.zstd`，解码必须走 stdin：`zstd -d -c <file>`（位置参数会被拒）。本例用户消息为 `[{type:'image',…},{type:'text',text:'发送内容为什么会显示这个，优化下插件'}]`；注入上下文是独立的 `source.kind:'plugin'` 事件（`@deepseek-ai/dsh-system-prompt`），不属于用户气泡。

## 验证结果

`tsc --noEmit` 0 错误；`npm test` 46/46（新增 3 个 `splitUserContent` / `contentBlocks` 回归用例）；构建成功，新 CSS 类（`.userAttachments`、`.fileCard` 等）与 `data-dsh-better-display="0.3.15"` 均已进产物。
