---
id: "8825c6b0-73cf-4d2a-9567-7efbbb28f4a6"
title: "dsh-better-display 合并上游 aa2246740 分支：时间轴/用量/产物功能与 0.1.3 类型适配"
description: "上游 fork（aa2246740/dsh-better-display）与本地 0.3.15 工作区的手工合并记录：新增 TimelineRail/TurnMetrics/deliverables/mcp-app 等 18 个文件改动，保留 projectUserText 修复，及对 0.1.3-alpha.1 staging 类型的三处适配"
status: "active"
created_at: "2026-09-09T06:10:44.746Z"
updated_at: "2026-09-09T06:10:44.746Z"
content_hash: "9def56d0fb9f69de286cef6eb9d4c2410edcf44c672ac76aa66b3cc56471d5b0"
source_paths:
  - "src/client/TimelineRail.tsx"
  - "src/client/TurnMetrics.tsx"
  - "src/client/deliverables.ts"
  - "src/client/mcp-app.ts"
  - "src/client/types.ts"
  - "src/client/index.tsx"
  - "src/client/Reader.tsx"
  - "src/client/Blocks.tsx"
session_ids:
  - "cbc2741c-74dc-4d0b-b22d-fae57c2e213b"
memory_body_ids:
  []
---

# dsh-better-display 合并上游 aa2246740 分支（2026-09）

工作对象：`/vol1/1000/Deepseek-Harness/项目/dsh-better-display`（DSH「阅读」视图插件，版本 0.3.15）。

## 背景：两个不同源的分支

- 本地工作区 `origin` 实际指向 **huiikeung/dsh-better-display**（本地 HEAD 897fae3，阅读视图 turn rail + 复制按钮）。
- 用户指定的 **aa2246740/dsh-better-display** 是独立演进的另一分支（HEAD e179c22，feat(reader): turn timeline rail + per-turn metrics + fork），commit 历史与本地完全不同源。
- 网络受限：`git fetch` TLS 握手失败、zip 下载超时 → **无法 git merge**，改用 GitHub API + raw 拉文件手工合并。

## 合并内容（上游 18 个文件改动）

新增：
- `TimelineRail.tsx/.module.css`：右侧轮次时间轴（整会话轮次大纲 + 已加载导航合并、fisheye 波浪 hover、跨页 loadThrough、busy 脉冲、渐变收尾、自动居中当前 tick）
- `TurnMetrics.tsx/.module.css`：每轮性能 pill（run time / tok/s / TTFT / cache hit%），popover 明细
- `deliverables.ts`：`getTurnDeliverables`（优先读 turn.data 的 deliverables，回退扫描 write/edit/apply_patch/str_replace_editor 工具调用）+ `createProducedFileMentions`（文件 chip）
- `timeline.ts`：`TimelineItem` + `mergeTimelineItems`
- `primitive-labels.ts`：Markdown/Read/Terminal/Search/Diff/Web 标签集中管理
- `McpAppFrame.tsx/.module.css` + `mcp-app.ts`：MCP app / ui block 渲染为 iframe 卡片，`fillComposer` 写回 composer（先试 conversation input shell 的 setDraft，失败回退 DOM）

修改：
- `types.ts`：`ReaderInjected` 增加 `openFile/revealFile/forkAt/loadThrough/fillComposer`；`BlockRenderProps` 增加 `fileMentions/metrics`
- `index.tsx`：实现上述注入；`forkAt` 调 `ctx.sessions.fork({sessionId, atSeq, increaseTitle})` 后 open 子会话；`revealFile` 先 POST `/better-display/reveal`，失败回退打开父目录
- `Reader.tsx`/`Blocks.tsx`/`ToolActivity.tsx`/`motion.tsx`/`projection.ts`/`Reader.module.css`：接入 TimelineRail、TurnMetrics、fork 按钮、deliverables 行、error banner 重构（cleanErrorMessage）、附件/文件卡样式

## 保留的本地修复（未被上游覆盖）

- `Blocks.tsx`：`projectUserText` 守卫（`typeof projectUserText === 'function'` + try/catch，缺失时退回纯文本，兼容旧 Host）；`UserText`、`FileCard`、`ImageBlock compact`
- `projection.ts`：`splitUserContent` / `contentBlocks`（文本-附件分离，附件排布在气泡上方）
- `types.ts` / `index.tsx`：命名空间类型导入（`import type * as DshChat` 等）保证 slot augmentation 进入 program——上游用的空 `import type {}` 会被 TS 擦除

## 对 0.1.3-alpha.1 staging 的三处类型适配

1. **`TurnTokenUsage`**：staging `ui-chat` 的 `client` 入口不 re-export，且 exports map 无 `/contract/chat-nodes` 子路径 → 在 `TurnMetrics.tsx` 定义本地接口（uncachedInputTokens/outputTokens/totalTokens/cacheRead/cacheWrite/reasoningTokens/inputTokens/routes）。
2. **`MarkdownFileMentions`**：staging `ui-primitives` 窄 shim 无此类型 → `BlockRenderProps.fileMentions` 用本地 `Record<string, {open, label, title?}>`。
3. **`TurnLocation.data`** 在 0.1.3 类型为 `unknown` → `deliverables.ts` 用 `(turn?.data as { get?: (key: string) => unknown })?.get?.('deliverables')` 安全访问；`BlockRenderProps.fillComposer` 设为可选避免与 PropsRuntime 约束冲突。

## 验证结果

- `tsc --noEmit`：0 错误；测试 46/46 通过
- `npm run build` 需 `DSH_HARNESS=/tmp/dsh-better-display-host`：成功，`lib/client.js` 1.20 MB + map 1.96 MB，外部 require 仍为 4 项（dsh-client-store、dsh-client-ui-primitives、react、react/jsx-runtime），无新增
- web profile 中插件以 `link:` 符号链接指向工作区，`lib/client.js` 已生效，无需重装

## 待用户侧验证

页面刷新；若旧提示残留则重启 `dsh web`（重启会中断会话）。验证点：阅读页发送内容恢复（附件在气泡上方、文件卡显示名称/扩展名/大小、文本 chip 投影）、右侧轮次时间轴、每轮性能 pill、fork 按钮、产物文件 chip 可点击打开。
