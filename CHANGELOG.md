# Changelog

## 0.3.0

Merges upstream `aa2246740/dsh-better-display` main (`933a45c`, released there as v0.1.1) on top of
our 0.1.6-alpha.2 work, then re-applies the 0.1.6 contract migration to the merged code.

### Live folding and reading chrome

- **Live fold**: while a turn is open, a later reasoning step collapses earlier steps of the same
  chain into one disclosure (`思考×N`). Body or tool updates alone never trigger it; a mid-turn
  user insert or steering message resets the chain. The auto-fold toggle can disable it.
- **Fold choreography**: keyed rows shrink for 320ms, counters roll for 160ms, hold 80ms, then
  reveal buffered output for 180ms. Preserve source order, selected text, reduced motion and the
  visible final answer; incoming data coalesces into one frame instead of restarting the shrink.
- **Closed process summary**: process counts stay discoverable after the live presentation retires.
- **Waiting clock**: the status line counts up from the latest human input (user message or
  non-queued pending submission), never from the enclosing turn's original start.
- **Message chrome**: user messages and turn ends carry a local clock; the turn end also carries
  its run duration, using the same copy as native chat (`用时 8分23秒`).
- **Sticky reading lanes**: the toolbar and status measure themselves with ResizeObserver and
  publish real lane geometry, so wrapped statistics no longer overlap.
- **Composer-safe landing**: rail jumps scroll the conversation container instead of calling
  `scrollIntoView`, which used to drag the sticky composer off the bottom of the viewport.
- **`data-chat-flow`**: the reading column keeps ChatView's empty hook so third-party skins that
  hide the composer when the scrollport lacks it (maid-atelier, phoebe-atelier, …) still treat
  Reader as an interactive conversation.

### Settings, deliverables and skills

- **Better Display settings section**: deliverables open in the system app by default, with an
  optional right-Sidebar preview, plus generative-mcpapps skill detection and install guidance.
- **Sidebar preview**: uses the shell's `sidebarRight.openResource` with session-scoped
  `dsh-resource://file/session/<id>/…` addresses from the official
  `@deepseek-ai/dsh-util-workspace-path` helper.
- **Skill status route**: `/better-display/skill-status` reports whether the generative-mcpapps
  skill is installed in a conventional role, and install guidance names only relative roots
  (`.dsh/skills`, `.agents/skills`).

### Contract correctness

- **Pending-submission echoes are defensive**: read `images` or the ordered `attachments` union,
  and never touch `.length` on a missing field, so a text-only send cannot crash
  `conversation.view`.
- **`compaction` counts as process**: the host emits both `manual-compaction` and `compaction`
  nodes; both now fold into the process disclosure.
- **Turn metrics use the real token contract**: `TurnTokenUsage` in 0.1.6 has no `inputTokens`;
  input is derived as `totalTokens - outputTokens`, and the popover gains cache-hit and reasoning
  badges.
- **Official typing instead of hand-rolled copies**: `settings.section` comes from
  `@deepseek-ai/dsh-client-ui-settings/client`, the skill remote is typed against the branded
  `SessionId`, and `tsconfig.json` maps `@deepseek-ai/dsh-client-store` so a DSH rename fails the
  build instead of degrading every selector hook to `any`.
- **Re-applied the 0.1.6 migration on merged code**: `useSessionPendingInteraction` →
  `useSessionStatus` (`snapshot.get(id)?.pendingInteraction`), which upstream still used.

### Distribution and verification

- Kept our checkout-free standalone client build
  ([`scripts/tsdown.standalone.config.mjs`](scripts/tsdown.standalone.config.mjs)); upstream's
  `tsdown.config.ts` path remains for in-checkout work.
- Kept our install/develop docs (no Harness source checkout required) and folded upstream's
  `dsh plugin add` guidance and `dsh.bundle` caveat into them.
- Upstream's new regression tests are included.

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
