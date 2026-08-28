# Changelog

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
