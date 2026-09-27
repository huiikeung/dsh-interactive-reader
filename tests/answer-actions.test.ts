import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

/**
 * Regression cover for the answer row's composition with the Host's official actions.
 *
 * `CopyAnswer` renders this fork's own copy / fork / usage / clock buttons plus the
 * official `conversation.chat.assistant-actions` contributions (feedback, save to
 * memory, …). The Host's own `MessageIconActions` places those contributions exactly
 * once, right after the copy button and before the branch button, and this row mirrors
 * that order.
 *
 * The three-way merge of upstream v0.3.x silently duplicated the child: upstream had
 * moved it next to the copy button while this fork still had it at the end of the row,
 * and git kept both insertions because neither side touched the other's line. Nothing
 * type-checks that — two identical JSX children are perfectly legal and only show up as
 * a visible duplicate in the reading tab — so the contract is asserted structurally,
 * the way the DOM-bound halves of this plugin are.
 */
test('the answer row renders the official actions once, in the Host\'s position', () => {
  const source = readFileSync(new URL('../src/client/Blocks.tsx', import.meta.url), 'utf8');
  const from = source.indexOf('export function CopyAnswer');
  const row = source.slice(from, source.indexOf('export function UserMessageActions'));

  const renders = row.match(/\{extraActions\}/g) ?? [];
  assert.equal(renders.length, 1, 'the official actions render exactly once');

  const at = row.indexOf('{extraActions}');
  assert.ok(at > row.indexOf('aria-label="复制回答"'), 'the actions follow the copy button');
  assert.ok(at < row.indexOf('aria-label="以此处为基础创建分叉会话"'), 'the actions precede the fork button');
  assert.ok(at < row.indexOf('<TurnMetrics'), 'the actions precede the usage and the clock');
});
