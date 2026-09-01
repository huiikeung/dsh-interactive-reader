# Changelog

## 0.3.13

- Add a copy action (with the message clock) under each user message in the reading view, matching the native chat's clock+copy row.

## 0.3.12

- Keep the "回到最新" pill at its natural height in the float slot and nudge it flush with the composer's right edge.

## 0.3.11

- Float the "回到最新" button above the composer (sticky bottom offset by `--dsh-composer-height`) aligned to the content column's right edge, like DSH's own to-bottom control.

## 0.3.10

- Nudge the "回到最新" button 15px so its right edge lines up with the composer row's right edge (the composer is 15px wider than the text column).

## 0.3.9

- Align the "回到最新" button to the content/composer column's right edge (sticky, bottom-right of the column) instead of the viewport edge.

## 0.3.8

- Pin the "回到最新" button to the viewport (fixed, above the composer) so it stays visible while scrolling instead of drifting with the content and getting clipped.

## 0.3.7

- Latch the "回到最新" button: show once the user leaves the bottom and keep it until they truly return, so a near-threshold scroll no longer flashes it on and off.

## 0.3.6

- Restore the "回到最新" button to only appear when scrolled away from the latest (undo the always-visible change).

## 0.3.5

- Always show the reading view's "回到最新" (jump-to-bottom) button instead of only when scrolled away from the latest.

## 0.3.4

- Let reasoning-card text follow the DSH content-font axis (same as the answer body and the chat), so thinking and answer always share one size instead of reasoning being pinned to 14px.

## 0.3.3

- Drive the reading view's base font from the DSH content-font axis (`--dsh-content-font-size` / `--dsh-content-font-delta`) instead of a hardcoded 16px, so text matches the chat summary and scales with the theme/mobile settings.

## 0.3.2

- Fold failed-tool notices (e.g. write/edit errors) into the tool's execution record instead of showing a loud banner in the main flow.

## 0.3.1

- Shrink the system-prompt disclosure triangle to a smaller chevron.

## 0.3.0

- Revert the custom model-retry card to DSH's native default: a quiet `details` disclosure showing the retry status, delay and failure reason (no custom icon column or timeline).

## 0.2.9

- Center the timeline dot precisely on the model-retry rule.

## 0.2.8

- Align the model-retry header with the tool rows: same 14px inset and 20px leading column, so the icon lines up with the tool icons above and below.
- Let the disclosure chevron render as the plain filled glyph (removing the extra stroke that made it look too thick).

## 0.2.7

- Render system-prompt records (inserted when switching models or resuming) as a collapsed "系统提示词" disclosure with the full prompt text, instead of the unsupported-record fallback.

## 0.2.6

- Run the model-retry vertical rule through the header icon's center and draw a timeline dot for each attempt, replacing the dashed separators.

## 0.2.5

- Match the model-retry title to the body type size.
- Use a standard retry (refresh) icon in neutral gray.
- Left-align the retry icon with the other flow-row icons.

## 0.2.4

- Tune the model-retry card: neutral icon color, a different icon, and vertical rule alignment with the header.

## 0.2.3

- Replace the model-retry node's raw JSON block with a structured RetryCard.
- Show a refresh icon, attempt count, and per-attempt delay/state/failure lines instead of the default chevron and JSON tree.

## 0.2.2

- Show the bordered reasoning card as soon as reasoning appears, instead of only after the text exceeds the preview height.
- Short reasoning now keeps the card frame, background, and rounded corners.

## 0.2.1

- Exclude the alpha.1 synthetic `turn-process` disclosure controller from Reader transcript content.
- Preserve real `assistant-step` reasoning on the original bounded reasoning-card path.
- Add a regression test for alpha.1 process control ordering.

## 0.2.0

- Adapted the reading view to DeepSeek Harness `0.1.2-alpha.1` and the split Chat/Conversation client APIs.
- Replaced removed `resultView` and `callView` fields with durable tool content, metadata, and arguments.
- Added localized labels required by the alpha.1 UI primitives.
- Added a standard `dsh.bundle.patch` for installation through `dsh plugin --profile web add`.
- Added a standalone external Web client build adapter.
- Included prebuilt `lib/` artifacts for direct Git and registry installation.

## 0.1.0

First public release of the accepted reading-view plugin, published as `dsh-better-display`.

- Native context and tool details with source-ordered, unmodified reasoning.
- Bounded long-reasoning cards with two-line following, expanded follow and manual pause/resume.
- Successful-turn process folding with a separate final answer.
- Source-ordered text reveal and quiet busy-state shimmer.
- Stable status typography and compact disclosure spacing.
- Native content fallbacks and a trusted-plugin block extension slot.
- 42 regression tests; no changes to DSH Agent, SDK, providers or core.
