import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('pinned selection', () => {
  it('covers every Reader body marker, so final formatting keeps a live selection', () => {
    const reader = [read('../src/client/Reader.tsx'), read('../src/client/AssistantNode.tsx')].join('\n');
    const motion = read('../src/client/motion.tsx');
    const selector = /usePinnedSelection\([^)]*selector = '([^']+)'/.exec(motion)?.[1] ?? '';
    const markers = ['data-reader-answer', 'data-reader-body'].filter(marker => new RegExp(`<article[^>]*\\b${marker}\\b`).test(reader));
    assert.ok(markers.length > 0, 'Reader must render at least one pinned-selection body marker');
    for (const marker of markers) assert.ok(selector.includes(`[${marker}]`), `selector must cover ${marker}`);
    assert.ok(selector.includes('[data-reader-process]'), 'selector must cover data-reader-process');
  });
});
