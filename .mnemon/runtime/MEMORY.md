DSH 插件类型坑：`import type {} from '@deepseek-ai/dsh-client-*'` 会在解析前被擦除，Host 包贡献的 slot augmentation（SessionStandardProps 的 useSession/sessionId/useChat 等）因此不进入 program，PropsRuntime 只剩一半。要用 `import type * as X from '...'` 并在类型里引用 `typeof X`。
§
dsh-better-display 在本机以 `link:` 方式装进 web profile（profiles/web/node_modules/dsh-better-display → 工作区符号链接），所以 `npm run build` 产出 lib/client.js 后无需重装插件。
§
重建 dsh-better-display 需 `DSH_HARNESS=/tmp/dsh-better-display-host`（从被裁剪的 Harness checkout 用 git archive 恢复的 staging 树：store/ui-slots 指向 src、ui-primitives 用手写 types.d.ts、ui-chat 等改为实体拷贝避免双份模块实例）；构建工具链在 /tmp/dsh-build-deps，npx 需 `--cache /tmp/npmcache`。
