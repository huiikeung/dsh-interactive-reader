# Changelog

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
