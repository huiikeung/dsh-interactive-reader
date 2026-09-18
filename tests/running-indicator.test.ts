import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runningIndicator } from '../src/client/projection.js';

/**
 * The reading view splits native Chat's single running label into a per-turn
 * process status and a waiting indicator. These cases pin the invariant that
 * matters: while the agent is running the view is never silent, because a
 * blank status right after sending reads as a dropped reply.
 */
test('an idle session shows no running indicator', () => {
  for (const lastTurnStatus of ['open', 'closed', 'unknown', undefined] as const) {
    assert.equal(runningIndicator({ running: false, awaitingModel: false, lastTurnStatus }), 'none');
    assert.equal(runningIndicator({ running: false, awaitingModel: true, lastTurnStatus }), 'none');
  }
});

test('an open turn with output flowing draws its own process status', () => {
  assert.equal(runningIndicator({ running: true, awaitingModel: false, lastTurnStatus: 'open' }), 'turn');
});

test('the waiting indicator stands in whenever the per-turn status cannot cover the run', () => {
  // Awaiting the model inside an open turn.
  assert.equal(runningIndicator({ running: true, awaitingModel: true, lastTurnStatus: 'open' }), 'waiting');
  // No group yet, or the turn is outside the loaded timeline window.
  assert.equal(runningIndicator({ running: true, awaitingModel: false, lastTurnStatus: undefined }), 'waiting');
  assert.equal(runningIndicator({ running: true, awaitingModel: false, lastTurnStatus: 'unknown' }), 'waiting');
  // The previous turn closed and the next one is starting.
  assert.equal(runningIndicator({ running: true, awaitingModel: false, lastTurnStatus: 'closed' }), 'waiting');
});

test('running always yields an indicator, never silence', () => {
  for (const lastTurnStatus of ['open', 'closed', 'unknown', undefined] as const) {
    for (const awaitingModel of [true, false]) {
      assert.notEqual(runningIndicator({ running: true, awaitingModel, lastTurnStatus }), 'none');
    }
  }
});
