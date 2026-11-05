import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Source-level contract for #82: every reasoning render path stamps the opaque
// per-mount block key, so another plugin can target one card across source
// growth, translation, and the original-text fallback. (Upstream renders the
// real component under vitest module mocks; node:test's mock.module cannot
// intercept through the tsx loader, so this fork pins the contract at the
// source level instead.)
const blocks = readFileSync(new URL('../src/client/Blocks.tsx', import.meta.url), 'utf8');

test('ReasoningStream stamps data-reader-reasoning-block-key from its blockKey prop', () => {
  // The prop is part of the props type, destructured at the component entry,
  // and stamped onto the reading-text div next to the kind marker.
  assert.match(blocks, /type ReasoningStreamProps = \{ blockKey: string;/);
  assert.match(blocks, /function ReasoningStream\(\{ blockKey, text,/);
  assert.match(blocks, /data-reader-reasoning-block-key=\{blockKey\}/);
});

test('both reasoning paths forward blockKey, transformed and plain', () => {
  // TransformedReasoning (text-transform seam) and the plain ReadingReasoning
  // fallback must BOTH hand the same key down; dropping either would let a
  // translated card lose its identity while the untranslated one keeps it.
  const transformed = blocks.match(/return <ReasoningStream \{\.\.\.props\} blockKey=\{blockKey\} text=\{shown\.text\}[^/]*\/>;/);
  assert.ok(transformed, 'TransformedReasoning must forward blockKey');
  const plain = blocks.match(/return <ReasoningStream \{\.\.\.props\} blockKey=\{blockKey\} \/>;/);
  assert.ok(plain, 'ReadingReasoning fallback must forward blockKey');
});

test('ReadingReasoning still routes through the text-transform registry', () => {
  // The key must not have replaced the transform seam: a registered reasoning
  // transformer keeps working, an unregistered one falls through untouched.
  assert.match(blocks, /if \(registry\?\.has\('reasoning'\)\) return <TransformedReasoning/);
  assert.match(blocks, /const registry = activeTextTransform\(\);/);
});
