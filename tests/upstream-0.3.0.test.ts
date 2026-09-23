import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { activitySummary, type ToolActivityEntry } from '../src/client/tool-activity.ts';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';

/**
 * Regression cover for the three fixes taken from upstream v0.3.0.
 *
 * Each was a real defect that also exists in this fork, because both sides sit on the
 * same v0.2.1 base upstream fixed on top of:
 *
 *  1. A code interpreter fell through to `other`, which has no renderer, so its output
 *     became prose and never entered a fold — hence its own `code` category.
 *  2. Turning auto-fold off, opening rows by hand and turning it back on left every
 *     earlier step stuck open — hence `resetExpanded` on the OFF→ON edge. The store
 *     cannot be imported under the test runner (the shell-seeded
 *     `@deepseek-ai/dsh-client-store` has no static ESM export), so that half is
 *     asserted structurally: the action exists and clears the map.
 *  3. Reading the follow intent from the observed scroll position (motion.tsx). It is
 *     DOM-bound and covered by the browser fixtures, so it is asserted here only
 *     structurally: the old `lastWrittenTop` inference is gone.
 */

/** A pending call for `name`, as the draft the reader holds before a result lands. */
function draft(name: string, argsRaw = '{}'): Pick<ToolActivityEntry, 'block' | 'draft'> {
  return { block: undefined, draft: { kind: 'tool-call', callId: 'call-1', name, argsRaw } as unknown as Extract<AssistantBlock, { kind: 'tool-call' }> };
}

test('a code interpreter is its own category, not a generic other', () => {
  const code = ['run_code', 'execute_code', 'code_interpreter', 'python', 'node', 'eval', 'repl'];
  for (const name of code) {
    const summary = activitySummary(draft(name));
    assert.equal(summary.category, 'code', `${name} is a code interpreter`);
    assert.equal(summary.title, '运行代码');
  }

  // A caller-supplied description still wins over the default title.
  assert.equal(activitySummary(draft('run_code', '{"description":"跑一遍基准"}')).title, '跑一遍基准');

  // Shells and commands keep their own categories next to it.
  assert.equal(activitySummary(draft('bash')).category, 'terminal');
  assert.equal(activitySummary(draft('str_replace_editor')).category, 'write');
  assert.equal(activitySummary(draft('read_file')).category, 'read');
  assert.equal(activitySummary(draft('grep')).category, 'search');
  assert.equal(activitySummary(draft('web_search')).category, 'web');
  assert.equal(activitySummary(draft('some_unknown_tool')).category, 'other');
});

test('the store declares resetExpanded so folding can be restored', () => {
  // Static import of the store is unavailable under the runner (see above), so read
  // the declared action list from the source instead of instantiating the store.
  const source = readFileSync(new URL('../src/client/store.ts', import.meta.url), 'utf8');
  assert.match(source, /resetExpanded: draft => \{ draft\.expanded = \{\}; \}/);
});

test('the follow intent no longer infers detaching from a written-top delta', () => {
  const source = readFileSync(new URL('../src/client/motion.tsx', import.meta.url), 'utf8');
  // The position-based form binds the intent to what the scroll event observes.
  assert.match(source, /const bottom = atBottom\(\);/);
  assert.match(source, /pinned\.current = bottom;/);
  // The old inference — a strictly upward delta against lastWrittenTop — is gone.
  assert.doesNotMatch(source, /scrollTop < lastWrittenTop - 1/);
});
