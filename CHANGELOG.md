# Changelog

## 0.2.1

Adapts the reading view to DeepSeek Harness `0.1.6-alpha.2`.

- **Fixed the 阅读 tab crashing on open**: `src/client/store.ts` had been replaced with a
  hand-rolled store whose handle had no `spec` and no `create()`. The renderer's store seat calls
  `handle.create(scopeKey)` when the tab is selected, so every selection threw
  `TypeError: handle.create is not a function` and the view rendered nothing. The real
  `defineStore` from the shell-seeded `@deepseek-ai/dsh-client-store` is back.
- **Migrated `useSessionPendingInteraction` → `useSessionStatus`**: 0.1.6 exposes pending
  interactions per session through the global `useSessionStatus` selector
  (`snapshot.get(sessionId)?.pendingInteraction`) instead of a dedicated hook.
- **Migrated pending-submission echoes**: `PendingSubmission.images` became the ordered
  `attachments` union of image previews and durable file references.
- **Type-safe against the real contracts again**: `tsconfig.json` again sets `strict: true` and
  maps `@deepseek-ai/dsh-client-store` to the installed package. Without that mapping the runtime's
  missing copy made every `SnapshotSelectorHook` re-export degrade to `any` under `skipLibCheck`,
  which is exactly why the renamed props above still compiled.
- **Self-contained client build**: `npm run build` now uses
  `scripts/tsdown.standalone.config.mjs`, which reproduces the official client-bundle contract
  (lazy-CJS `__ModuleLoader__.load`, shell-seed and `dsh.client.inject` modules kept external,
  hashed CSS-module class maps with injected `<style>` tags) without a Harness source checkout or
  `lightningcss`.
- 63 regression tests.

## 0.2.0

Adds native generative MCP Apps (SEP-1865) support and rich interactive rendering.

- **Generative MCP Apps**: auto-detect ````mcp-app` code blocks (or `mcp-app` custom blocks / `render_ui`/`show_widget` tool results) and mount them as live, interactive cards.
- **Sandboxed iframe**: `sandbox="allow-scripts allow-forms"` without `allow-same-origin`, `referrerPolicy="no-referrer"` — full isolation from host cookies/tokens/DOM.
- **SEP-1865 JSON-RPC bridge**: `ui/initialize`, `ui/resize`, `ui/submit` / `ui/update-model-context`, plus live `host-context-changed` theme broadcasts.
- **Bidirectional feedback**: user interactions produce a natural-language prompt written straight into the composer via React 18 native setter (instant, no stale-DOM whitespace).
- **Live dark/light sync**: MutationObserver + matchMedia drive instant re-theming with zero first-frame flash.
- **Pixel-perfect auto height**: content-bottom bounding-box measurement + ResizeObserver; 60px–2400px smooth grow/shrink, no double scrollbars or wasted whitespace.
- **Redesigned minimal container**: removed protocol/status chrome, 14px-radius subtle card, icon-only reset.
- **Skill pack**: `skills/generative-mcpapps/` with SKILL.md, protocol reference, HTML boilerplate template, and interactive quiz example.
- **Docs**: bilingual `README.md` / `README.en.md`; DESIGN.md contract updated.
- 49 regression tests.

## 0.1.0

First public release of the accepted reading-view plugin, published as `dsh-better-display`.

- Native context and tool details with source-ordered, unmodified reasoning.
- Bounded long-reasoning cards with two-line following, expanded follow and manual pause/resume.
- Successful-turn process folding with a separate final answer.
- Source-ordered text reveal and quiet busy-state shimmer.
- Stable status typography and compact disclosure spacing.
- Native content fallbacks and a trusted-plugin block extension slot.
- 42 regression tests; no changes to DSH Agent, SDK, providers or core.
