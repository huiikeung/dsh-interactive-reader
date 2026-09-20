import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POPUP_GAP,
  POPUP_MIN_HEIGHT,
  POPUP_PANEL_WIDTH,
  popupLayoutFor,
} from '../src/client/popup-placement.js';

// The composer seat sits at y=450 in these fixtures, so nothing may go below it.
const viewport = { viewportWidth: 1280, availableBottom: 450 };

test('a trigger low in the viewport still opens upward', () => {
  // The regression: this case used to be decided from `spaceBelow`, so a trigger with
  // only 186px below it was placed *below* — into the Host's composer band, which paints
  // over the panel and made it read as transparent.
  const layout = popupLayoutFor({ ...viewport, triggerTop: 414, triggerBottom: 434, triggerLeft: 499 });
  assert.equal(layout.placement, 'above');
  assert.ok(layout.maxHeight >= 211, 'the real panel is ~211px tall and must fit');
});

test('a trigger near the top flips below, where there is room', () => {
  const layout = popupLayoutFor({ ...viewport, triggerTop: 60, triggerBottom: 80, triggerLeft: 40 });
  assert.equal(layout.placement, 'below');
});

test('a near-top trigger keeps opening upward when below is no better', () => {
  // Both sides are cramped and below is *worse*: upward stays, because that is the
  // panel's natural direction and the side the trigger's own row frees up.
  const layout = popupLayoutFor({ viewportWidth: 1280, availableBottom: 450, triggerTop: 180, triggerBottom: 300, triggerLeft: 10 });
  assert.equal(layout.placement, 'above');
  const flipped = popupLayoutFor({ viewportWidth: 1280, availableBottom: 450, triggerTop: 180, triggerBottom: 200, triggerLeft: 10 });
  assert.equal(flipped.placement, 'below', 'below wins only when it genuinely has more room');
});

test('the panel is clamped inside the viewport horizontally', () => {
  assert.equal(popupLayoutFor({ ...viewport, triggerTop: 400, triggerBottom: 420, triggerLeft: 0 }).left, POPUP_GAP);
  const right = popupLayoutFor({ ...viewport, triggerTop: 400, triggerBottom: 420, triggerLeft: 1200 });
  assert.equal(right.left, viewport.viewportWidth - POPUP_PANEL_WIDTH - POPUP_GAP);
  assert.ok(right.left + POPUP_PANEL_WIDTH <= viewport.viewportWidth);
});

test('a short window caps the height instead of cutting the panel off', () => {
  const layout = popupLayoutFor({ ...viewport, triggerTop: 300, triggerBottom: 320, triggerLeft: 100 });
  assert.equal(layout.placement, 'above');
  assert.equal(layout.maxHeight, 300 - POPUP_GAP * 2);
});

test('the height cap never collapses the panel to a sliver', () => {
  const layout = popupLayoutFor({ ...viewport, triggerTop: 20, triggerBottom: 40, triggerLeft: 100 });
  assert.ok(layout.maxHeight >= POPUP_MIN_HEIGHT);
});

test('the composer band is not counted as room below', () => {
  // Viewport bottom is 620 but the composer seat starts at 450: a trigger at 284 has
  // only 166px of usable space below, so it must not flip down into the composer.
  const layout = popupLayoutFor({ ...viewport, triggerTop: 264, triggerBottom: 284, triggerLeft: 499 });
  assert.equal(layout.placement, 'above');
  const withViewportBottom = popupLayoutFor({ viewportWidth: 1280, availableBottom: 620, triggerTop: 264, triggerBottom: 284, triggerLeft: 499 });
  assert.equal(withViewportBottom.placement, 'below', 'counting the composer as room is what caused the bug');
});
