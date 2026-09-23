# Changelog

## 0.9.0

Two more pieces of the official-component bridge: prose file mentions, and the
general composition adapter they and everything else will build on.

### Prose file mentions come from the Host

Inline code that names a workspace file used to open it only when this fork's own
produced-path matcher recognised it. The Host ships a `chatFileMentions` service for
exactly this — `dsh-client-ui-deliverables` provides it and the official chat consumes
it through `forClosing(owner, sessionId)`. The reading tab now asks for it the same
way, and composes: the official resolver wins, this fork's produced-path matcher answers
where it declines, and either alone is used when the other is absent. On a Host with no
provider nothing changes.

### The bridge is now one adapter

`official-slots.ts` mirrors a host-declared slot's contributions into a Reader-owned
seat: registration metadata (id, order, locale, inject) and the component object travel
intact, the platform re-runs each entry's `inject(sessionId)` against the session being
read, and no official renderer is reimplemented. Child slots are mirrored recursively
under namespaced seats, which is what lets a contribution that declares children keep
rendering them — a second declarer of the same sub-slot key is a load-time throw.

Two ordering constraints were found the hard way and are now load-bearing:
the mirrors must run *after* our `conversation.view` registration declares the seats
(running earlier throws "a parent entry's children table must declare it"), and a
family that fails must not take the reading tab down, so each is isolated and named.

### Not in this release

Tool details, produced-file cards and unknown node kinds are still this fork's own
renderers. Each needs a live session holding the relevant data to be verified against,
and replacing a verified renderer on speculation is not worth the risk — the seats for
them are one line away in this module once that data exists.

201 tests pass; typecheck and build clean. Verified in the running GUI: the plugin
activates with no console error, the official actions strip still renders (four turned
rows, 16 official controls) alongside this fork's own answer row, and the reading tab
matches the native chat tab's output on the same session content.

## 0.8.1

Markdown images with a local path now render instead of degrading to alt text.

`![图](/vol1/1000/a.png)` is not a URL, so the protocol allowlist rejected it and the
renderer fell back to the alt text. The Host serves workspace files at
`/api/file?path=…` on the same origin — the same `localPathMediaUrl` the official chat
markdown uses — and `platform-media.ts` now builds that URL as a fallback, mirroring
the Host's conditions exactly: only http/https pages, only absolute POSIX paths, never
protocol-relative, relative or empty destinations, and the path is percent-encoded.

Authorization stays Host-side. This only builds the URL; the Host's file API decides
whether the path may be read, so an inaccessible file still fails as an image request
and keeps the alt fallback rather than leaking anything.

199 tests pass; typecheck and build clean. The endpoint was verified live against the
running Host (HTTP 200 serving a workspace file), and the reading tab was re-checked
afterwards: the reader, the official actions strip and this fork's own row all still
render with no console error.

## 0.8.0

The reading tab now shows the official answer actions, starting with feedback.

Upstream v0.3.0 bridged its reader to the host's official components. This is the
first step of that bridge, and the smallest visible piece: the reading tab now
renders `conversation.chat.assistant-actions`, the host-declared slot the native
chat tab has always used.

### What you get

Thumbs-up / thumbs-down on the closing answer, and clicking either opens the
official feedback form — 任务结果、指令理解与遵循、产品功能与交互、稳定性和速度、
资源使用与费用、安全隐私与权限、其他 — with the same submit path the chat tab uses.
The same strip also carries「在上下文视图中查看此轮」and「存入记忆」where those
plugins contribute them, and anything registered there in future appears here too.
Our own copy, fork, delay and usage controls stay ours and sit in the same row.

### Why a seat mirror is unavoidable

A component may render only the slots its own registration declares in `children`,
`renderSlot` throws `SlotOwnershipError` otherwise, and a slot may be declared
exactly once — the host already declares this one, so re-declaring it throws
`slot "..." is already declared`. The platform therefore gives a plugin no way to
render another owner's slot, and `official-actions.ts` lends the official
contributions a Reader-owned seat instead: registration metadata (id, order, locale,
inject) and the component object travel intact, the platform re-runs each entry's
`inject(sessionId)` against the session being read, and no official renderer is
reimplemented. Contributions that declare child slots are skipped — mirroring those
needs the recursive namespacing the full bridge uses, and skipping is exactly where
they stood before.

### Verified

196 tests pass; typecheck and build clean. In the running GUI the reading tab renders
the official strip (four turned rows, 16 official controls), clicking a thumb opens
the official feedback dialog with its full category list, our own six answer controls
still render, and no console error is thrown.

This is step one of the bridge, not the whole thing: tool details, file cards, file
line numbers and local Markdown images are still this fork's own implementations, and
upstream v0.3.0 removes `getToolView` to do them, which this fork builds on.

## 0.7.1

Ports three fixes from upstream `aa2246740/dsh-better-display` v0.3.0. Each was a real
defect that also existed here, because both sides sit on the same v0.2.1 base upstream
fixed on top of.

### Scroll-follow no longer yanks the reader to the bottom

A reader parked mid-transcript — a scrollbar drag, a key, any scroll whose delta
against `lastWrittenTop` was under 1px — kept `following` and `pinned` true, because
that baseline is nulled by `cancelFollow`/`onWheel`/`onTouch`/`onKey` and the guard
already returns for sub-pixel deltas. The next content growth then took the re-attach
branch and jumped the viewport to the bottom, discarding what they were reading.

The follow intent is now bound to the position observed at the scroll event itself:
a fold's clamp lands at the very bottom and still keeps following, any other offset
detaches. No baseline to null, so no hole to fall through. The unused global
`document.body.dataset.readerFolding` writes are gone with it — one row's disclosure
state never belonged on `document.body`.

### Turning auto-fold back on actually re-collapses

Folding off, opening rows by hand, then folding back on left every earlier step stuck
open: the summary folded but the manually expanded rows never re-collapsed, because the
`expanded` map survives the preference change. Reader now watches the *effective*
preference (prefs first, store as fallback, so toolbar and Settings behave alike) and
drops the manual expansions on the OFF→ON edge. The selection guard still keeps an
active selection expanded.

### Code interpreters render as terminal output

`run_code` had no category of its own and fell through to `other`, which has no
renderer — so its output was emitted as ordinary prose and sat in the transcript
outside every fold, exactly the block the reader wanted to close. A new `code` category
renders it through `TerminalBlock` with command, cwd, exit code and signal, using the
same labels as a shell call.

### Not ported

Upstream v0.3.0's headline feature — a bridge mapping official component registrations
(feedback, tool details, file cards, line numbers, local images) into the reader's own
slots — is not included. It is a ~640-line architectural change validated against
Harness 0.1.5-rc.2, this fork targets 0.1.6-alpha.2, and it removes `getToolView`, which
this fork builds on. It is a separate effort, not a drop-in.

191 tests pass; typecheck and build clean. Verified in the running GUI: the reader root
renders at 0.7.0 with the new build served, and the host bundle carries all three fixes.

## 0.7.0

Renamed: **`dsh-better-display` → `dsh-interactive-reader`**.

Not cosmetic. `dsh-better-display` on npm belongs to the upstream `aa2246740` (latest
0.3.0), so this fork could never publish under it — and the inherited README told
people to install `github:aa2246740/dsh-better-display`, i.e. the upstream's code
rather than ours. The name also said nothing: it is a reading view, not a display
tweak. `dsh-interactive-reader` matches the Chinese name 交互阅读 and the 阅读 tab.

Everything that carried the old name moved with it: the package name, `main` /
`types` paths, the host entry and its output (`lib/dsh-interactive-reader.js`),
the client bundle id, the plugin id in `cordis.yml` / `cordis.patch.yml` /
`dshx.yml`, the `dsh-interactive-reader.block` slot key, the
`data-interactive-reader` DOM attribute and its `data-interactive-reader-*`
setting hooks, the locale namespace, log prefixes, the settings nav
(`Interactive Reader` / 交互阅读), the nav-glyph label match, and the README
install lines — which now point at `github:huiikeung/dsh-interactive-reader`
instead of the upstream.

**Deliberately NOT renamed: the store persistence key stays `dsh.reader.v1`.**
Changing it would silently drop every user's frosted-glass, fold-intensity and
open-mode settings on upgrade. There is a test pinning it.

The settings-nav icon guards this too: `dsh-interactive-reader` is another id the
core `navIcon()` map does not know, so the runtime pin in `pinNavGlyph()` is what
keeps it off the gear fallback — the same mechanism 0.6.2 settled on, now keyed to
the new label and mark attribute.

187 tests pass; typecheck clean. The README's install assertions now derive the
repo slug from `package.json` instead of hard-coding an owner, so they cannot go
stale on the next rename.

### Migrating an existing install

The package name changed, so a `link:` install must be re-pointed. From the
profile directory (`$DSH_HOME/profiles/web`), or with `dsh plugin`:

```sh
# profile/package.json: dependencies
"dsh-interactive-reader": "link:/path/to/dsh-interactive-reader"
# profile/package.json: dsh.profile.bundles — replace the old entry in place
# node_modules: point the symlink at the renamed directory
```

Then restart the Host and reload. Client-side changes alone do not need a restart,
but the bundle id does.

## 0.6.2

Drops the core patch and keeps only the runtime nav-glyph pin.

0.6.1 pinned the settings icon with two mechanisms: a runtime pin and a patch to the
core `navIcon(id)` map. The core patch turned out to be the wrong half to keep — it
edits a file several plugins patch, so a DSH runtime re-extract or another plugin
installing or removing its own branch silently wipes it, and this machine was
observed to do exactly that to three other plugins at once. It is now gone:
`scripts/patch-settings-icon.mjs` is deleted and the branch it had written into
`dsh-client-ui-settings-general` is removed, leaving that bundle as shipped.

What remains is the runtime pin in `pinNavGlyph()`, which locates this section's own
nav cell by its label text, rewrites that cell's `<svg>` geometry in place, and
re-applies through a MutationObserver when the shell re-renders the nav. It touches
only its own cell, depends on none of the shell's hashed class names, and never edits
DSH core, so a runtime update cannot lose it and no other plugin can clobber it.

Verified with the core bundle back to its shipped state: the icon still renders, and
still renders after closing and reopening the settings panel.

180 tests pass; typecheck clean.

## 0.6.1

Names the plugin in Chinese: **交互阅读**.

The zh dictionary carried `Interactive Reader` as well, so a Chinese Host showed an
untranslated nav entry. The English name is unchanged and keeps the package
identity.

The name says what the section is rather than what it does for you: not an
assistant, but an *interactive presentation of the same conversation*. Against the
two native tabs it earns the word — 对话 is a passive bubble stream and 轨迹 a
static log, while this view folds the process live, jumps between turns, expands
diffs, locates produced files, and mounts MCP Apps cards that talk back to the
composer over JSON-RPC.

It appears when the Host language is 中文; an English Host still shows
`Interactive Reader`, which is the intended locale behaviour rather than a leftover.

### The settings-nav icon

The section also showed the settings gear, because DSH picks nav glyphs from a
hard-coded `navIcon(id)` map inside `dsh-client-ui-settings-general` and the
`settings.section` contract carries no icon field (`SettingsSectionOwnerProps` has
only `close`) — an unknown id falls back to `IconSettingsOutline16`.
Two complementary mechanisms pin it to `IconBrowseOutline16` — a page with text
lines:

- **Runtime pin (primary)**: `pinNavGlyph()` in the plugin's own bundle finds this
  section's nav cell, rewrites its `<svg>` in place, and re-applies through a
  MutationObserver when the shell re-renders the nav. It touches only its own cell,
  depends on none of the shell's hashed class names, and therefore survives DSH
  runtime updates and other plugins patching the same core file — which a core patch
  cannot.
- **Core patch (fallback)**: `scripts/patch-settings-icon.mjs` covers the window
  before our bundle has run. It is idempotent, keeps a `.dsh-interactive-reader.bak`,
  self-checks that the patched bundle still parses, and on failure removes only its
  own injected branch — restoring the whole `.bak` would also wipe every other
  plugin's patch to that file, which was observed happening on this machine.

180 tests, including assertions pinning the Chinese name, the locale resolution for
both dictionaries, and the two dictionaries agreeing on every key.

## 0.6.0

Redesigns the **Interactive Reader** section in Settings after `dsh-vision-router`'s panel: the
title sits outside any border, **each module is its own bordered box**, and a module whose
body is long opens on a click. Presentation only — every switch, field and action keeps the
behaviour and the `data-interactive-reader-*` hooks it had.

### What was wrong

- No section title at all: the panel opened straight into a switch row, so the section had no
  identity next to General or Models.
- Controls were vertically centred, so a toggle floated in the middle of a three-line
  description instead of sitting on its label's line.
- The first three rows were plain rows with a divider while the fnOS field and the skill
  status were unseparated blocks, so the vertical rhythm broke halfway down.
- Everything was hand-rolled — including the switch and the text field — instead of the
  shell's own controls, and long content was simply dumped into the panel.

### What it looks like now

- **The title carries no border**: `Interactive Reader` plus a muted subtitle stand above the
  boxes, like the reference's own section heading.
- **One border per module**: each setting is its own 12px-radius box with a `border-l2`
  hairline (`l1` is 4% black and a white box on a white panel needs an edge you can see),
  separated by a 10px gap — so the panel reads as independent settings, not one slab.
- **Long content opens on a click**: the fnOS template and the skill report render only
  their header until opened. The header is the toggle (`aria-expanded`), it carries the same
  left-hand chevron cue the reference uses (pointing right closed, down open), and the skill
  module keeps its status `Tag` visible while closed.
- A module that is nothing but a labelled switch stays open, because its description *is*
  the setting.
- **Shell primitives** replace the hand-rolled controls: `Switch`, `Input`, `Button` and
  `Tag` from `@deepseek-ai/dsh-client-ui-primitives` — the same controls the reference uses,
  which is why it needed almost no bespoke styling.

Removed with the rewrite: the unused `FOLD_STOPS` table, the hand-rolled switch styles, and
the dead segment/slider rules.

### Verified

- Live in the running GUI: the title's border is `0px`, five modules each carry a `1px`
  border, two of them are toggles; clicking both opens their bodies (the fnOS `Input`
  appears, the chevron rotates 90°) and clicking again closes them. No page errors.
- Dark theme flips entirely through tokens (box `rgb(21,21,23)`, border
  `rgba(255,255,255,.12)`), and a 900px window has no horizontal overflow.
- `SettingsSection.tsx` and its sheet are 1:1 — no class used but undefined, none defined
  but unused.
- 177 tests pass; typecheck and build clean.

## 0.5.1

Fixes the turn-metrics panel (「本轮性能与用量概况」) going see-through when the usage pill
sits low in the window.

### What it was

The panel's placement was decided from the space *below* the trigger and then concluded the
opposite: with only 186px below, it placed the panel below anyway. That drops it straight
into the Host's sticky composer band, which paints over anything there — so the panel was
cut to a ~26px strip and its body read as transparent with the composer's own text showing
through it.

### The rule now

- The panel opens **upward by default**, which is the side the trigger's own row frees up.
  It flips below only when the trigger sits too close to the top for the panel to fit there
  *and* the other side genuinely has more room.
- The lower limit is the Host **composer seat's top**, not the viewport bottom: the composer
  band is not usable space, and counting it as room is what caused the bug.
- The panel is capped by the space it actually has (`max-height` + own scroll) and clamped
  inside the viewport horizontally, so a short window scrolls it instead of cutting it off.
- `data-placement` now reports the chosen side.

The rule moved to [`src/client/popup-placement.ts`](src/client/popup-placement.ts) so it is
testable on its own; `tests/popup-placement.test.ts` pins the low-trigger case, the flip, the
horizontal clamp and the composer-band exclusion. Verified live in a 620px window with the
pill 16px above the composer: the panel renders 211px tall, fully opaque, clear of the
composer, entirely inside the viewport. 177 tests.

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
- The plugin's `/interactive-reader/reveal` route and its `child_process` spawn are gone.
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
type (`dsh-resource://interactive-reader-folder/…`, the only scheme the shell routes),
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

Merges upstream `aa2246740/dsh-interactive-reader` main (`066f10a`, released there as v0.2.1) on top of
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

Merges upstream `aa2246740/dsh-interactive-reader` main (`933a45c`, released there as v0.1.1) on top of
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

- **Interactive Reader settings section**: deliverables open in the system app by default, with an
  optional right-Sidebar preview, plus generative-mcpapps skill detection and install guidance.
- **Sidebar preview**: uses the shell's `sidebarRight.openResource` with session-scoped
  `dsh-resource://file/session/<id>/…` addresses from the official
  `@deepseek-ai/dsh-util-workspace-path` helper.
- **Skill status route**: `/interactive-reader/skill-status` reports whether the generative-mcpapps
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

First public release of the accepted reading-view plugin, published as `dsh-interactive-reader`.

- Native context and tool details with source-ordered, unmodified reasoning.
- Bounded long-reasoning cards with two-line following, expanded follow and manual pause/resume.
- Successful-turn process folding with a separate final answer.
- Source-ordered text reveal and quiet busy-state shimmer.
- Stable status typography and compact disclosure spacing.
- Native content fallbacks and a trusted-plugin block extension slot.
- 42 regression tests; no changes to DSH Agent, SDK, providers or core.
