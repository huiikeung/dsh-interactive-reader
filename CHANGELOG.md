# Changelog

## 0.5.0

Makes「在文件夹中显示」work everywhere instead of only on macOS and Windows, and gives
it a real target on this headless fnOS NAS.

### Why it was broken

- The plugin's own host route branched on `darwin` (`open -R`) and `win32`
  (`explorer /select`) and sent everything else to `xdg-open <file>`. On a NAS there is
  no `DISPLAY`/`WAYLAND_DISPLAY`, so that command spawns into nothing — and it was the
  wrong path anyway, because revealing means the *parent* directory.
- The route answered `{ ok: true }` whether or not an opener could ever work, so the
  chip flashed「已定位」while nothing happened.
- The tooltip was hard-coded to macOS (「在访达中定位所在目录」).

### Use the Host's own contract

- Capability now comes from the official `GET /api/present.host`
  (`sessionController.workspaceDesktop()`), which answers
  `{ name, available, fileManager }`; on this box that is
  `{ name: "MEmini-NAS", available: false, fileManager: "directory" }`.
  `session.canOpenWorkspacePath()` is the fallback for Hosts without the route. One
  memoized probe is shared by every chip.
- The reveal itself goes through `session.openWorkspacePath({ path, action: 'reveal' })`,
  so Finder selects the file, Explorer selects it, and a desktop Linux Host opens its
  parent — the Host owns the platform difference.
- The plugin's `/better-display/reveal` route and its `child_process` spawn are gone.
- Wording follows the Host's own `fileManager` (访达 / 文件资源管理器 / 文件管理器).

### What each Host does now

1. **A configured fnOS file-manager URL** (Settings, optional) wins when the folder is
   inside fnOS's own `/vol{n}/…` space: it opens in a new tab, synchronously inside the
   click so the user gesture survives. Placeholders are `{path}`, `{encodedPath}` and
   `{name}`; a template without a path placeholder is refused rather than silently
   opening the file manager's home screen.
2. **A Host with a desktop** uses its own opener as above.
3. **A Host without a desktop** opens the new right-sidebar **folder pane**.
4. If the pane cannot be opened either, the absolute folder path is copied and the chip
   says so (「复制所在目录路径（<host> 没有桌面环境）」) — never a success tick for
   something that did not happen. Copying works on the LAN HTTP origin too, where
   `navigator.clipboard` does not exist and `execCommand` is the fallback.

### The folder pane

DSH cannot point its own files tree at a path — that type is a builtin page with no
`patterns`/`canOpen`, so it is never an address candidate, and its root comes from the
session rather than from the open call. So the plugin ships its own address-routed tab
type (`dsh-resource://better-display-folder/…`, the only scheme the shell routes),
registers its body under `sidebar.right.pane.tab` keyed by the type id, and reads the
address through the seat-injected `useTabInfo()`. Content comes from the official
`workspaceFiles.list` Remote, which keeps listings workspace-scoped and capped, so the
pane adds no read route of its own.

Directories list first with sizes, a folder button opens the shell's own file preview,
and an up-button walks to the parent. The registrations are skipped when the shell has
no tab registry, which degrades to copying the path instead of failing the plugin.

### Verified on this host

- Empty template: chip label「复制所在目录路径（MEmini-NAS没有桌面环境）」, and the
  click leaves `/vol1/1000/…/src/client` on the clipboard.
- Configured template: the click opens exactly
  `…/trim.file-manager?path=%2Fvol1%2F1000%2F…%2Fsrc%2Fclient&name=client`.
- No template: the click opens the pane on that folder (61 entries: 2 directories,
  59 files, with sizes) and walking into `markdown` re-roots it.
- 170 regression tests; the new ones cover the desktop payload, the `/vol{n}` space
  check, template expansion, branch order, and the pane's address grammar and ordering.

## 0.4.0

Merges upstream `aa2246740/dsh-better-display` main (`066f10a`, released there as v0.2.1) on top of
our 0.3.0, then re-applies the 0.1.6-alpha.2 contract migration to the merged code. Upstream's own
release notes for those two versions live in the upstream repository; this entry records what we
took, what we kept, and what had to be re-migrated. Everything below is on top of 0.3.0.

### Diff review

- **New diff panel** ([`src/client/DiffPanel.tsx`](src/client/DiffPanel.tsx)): one entry per changed
  file with file tabs, removed lines on a red wash and added lines on a green one, using the host's
  own `DiffBlock` primitive.
- `+A -R` statistics sit flush against the right margin on the same 32px baseline as the summary
  text, so the counts no longer drift with the row.
- The overlay expands inside the reading column with no horizontal overflow and scrolls on its own
  (`max-height: 420px`, `overscroll-behavior: contain`), so a wheel gesture at the end of a diff no
  longer leaks into the conversation stream. Multi-file tabs scroll horizontally and the panel
  height adapts when the tab changes.
- Counts are read from the tool result the host already attaches (`meta.diffs`, with a
  `write` / `edit` / `str_replace_editor` fallback on the call arguments), and a parent call folds
  its children's counts into its own.

### Custom tool cards

- Tool rows delegate to the host's `tool.call.toolview` slot, so a third-party tool view renders
  inside the reader through `getToolView()` instead of being re-implemented here. Each card is
  isolated behind an error boundary and expands on mount.

### Translucent frosted glass (skin mode)

- Opt-in **半透明毛玻璃** toggle: card backgrounds, tool detail frames and code blocks become
  translucent with a backdrop blur, so wallpapers and third-party window skins no longer produce
  opaque white patches. Off by default; the opaque chrome is unchanged.
- Sticky lanes use the same liquid glass, and detail chips stay transparent until hover or focus.
- Published as `data-reader-glass` on the reader root. Skin mode no longer carries a second lane
  ladder of its own.

### Folding and liveness

- Fold intensity is a real three-stop setting (关闭 / 开启 / 摘要) persisted on the root
  `dsh.reader.v1` key and shared with Settings, so the reading toolbar and the Settings section
  agree across a reload. `autoFold` and `processOnly` stay derived fields, so snapshots written by
  0.3.0 still load.
- Level 摘要 is community PR #14's process-only mode: prose is never folded and each finished run
  of reasoning / tool / record steps collapses into one digest that names what the tools actually
  did. Level 开启 keeps the existing choreography; 关闭 expands everything.
- Every animated disclosure now has a wall-clock deadline as well as its animation promises. A
  cancelled animation (or a hidden tab, which delivers no frames) used to leave the fold machine in
  a non-idle phase forever, holding the reveal at the shown snapshot until the view remounted.
- While the choreography holds the reveal, the stream buffer keeps absorbing the source instead of
  returning early, so text never resumes from a stale target once the fold settles.
- The wait anchor now restarts on a **returned tool**. The handover set named `tool-result` from the
  conversation contract while the reader matches the chat layer's `tool-call` row whose `data.root`
  carries a result, so the branch was dead and a returned tool never restarted the clock. The kinds
  are now typed against the host's own `ChatNodeKind` union, so a wrong name fails `tsc`.
- `WaitClock` renders the live wait readout (plain seconds, plus a 「暂未响应」 badge past ten
  seconds), and the status line reports how many sub-agents the turn dispatched, read from the
  host's own turn-process row rather than counted again here.

### Lanes and the composer

- Every pinned reader lane stays below the host's sticky composer seat. A scrolling reader clamps
  turn-level sticky lanes into the footer band, which passes behind the input card, so the live
  status lane used to paint its own opaque plate over the composer.
- The live status lane now owns the measured lane under the toolbar, exactly like the closed
  summary rows. Lanes a scroll can clamp into the footer band stay at `z-index: 6`; only the top
  toolbar lane keeps `7`, which also keeps it above the host's code-block banners.
- The toolbar's `--reader-control-width` is measured from the union of its control rects: it now
  reserves the whole control group including the gaps between toggles, and a wrapped toolbar can no
  longer produce a negative reservation.

### Kept from our side

- **The 0.1.6-alpha.2 contract.** `useSessionStatus(snapshot => snapshot.get(sessionId)?.pendingInteraction)`
  stays instead of upstream's `useSessionPendingInteraction`, and the defensive
  `attachments` / `images` pending-submission echo stays.
- **The 动效 (motion) toggle** in the reading toolbar, which upstream does not have. The auto-fold
  button now also writes through to the shared Settings store, so both stay in sync.
- Our checkout-free standalone client build
  ([`scripts/tsdown.standalone.config.mjs`](scripts/tsdown.standalone.config.mjs)) and the install
  docs that go with it. Because that build injects a pretty-printed stylesheet where upstream's
  lightningcss build minifies one, `tests/footer-precedence.test.ts` reads the committed bundle's
  lane ladder with a whitespace-tolerant match.
- Our reading-view turn rail, native labels, projection and tool-activity work are untouched.

### Verification

- 147 regression tests, up from 125. Upstream's new suites are included
  ([`tests/fold-intensity.test.ts`](tests/fold-intensity.test.ts),
  [`tests/tool-diff.test.ts`](tests/tool-diff.test.ts),
  [`tests/footer-precedence.test.ts`](tests/footer-precedence.test.ts)) along with its extensions to
  `waiting-clock`, `word-timeline`, `stream-buffer`, `fold-choreography`, `open-file` and
  `stock-install`.

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
