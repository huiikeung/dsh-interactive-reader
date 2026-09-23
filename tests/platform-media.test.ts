import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localPathMediaUrl } from '../src/client/platform-media.ts';

/**
 * Regression cover for the local-media URL contract.
 *
 * A Markdown image whose destination is an absolute POSIX path (`/vol1/1000/a.png`)
 * is not a URL, so the protocol allowlist used to reject it and the reading tab fell
 * back to the alt text. The Host serves workspace files at `/api/file?path=…` on the
 * same origin — the same `localPathMediaUrl` the official chat markdown uses — so the
 * reading tab now builds that URL instead.
 *
 * The unit mirrors the Host's own conditions exactly, because getting them wrong is
 * not a cosmetic failure: a protocol-relative or Electron `file://` destination must
 * never be turned into a request.
 */

test('an absolute POSIX path becomes a same-origin Host file URL', () => {
  assert.equal(
    localPathMediaUrl('http:', 'http://127.0.0.1:2298', '/vol1/1000/a.png'),
    'http://127.0.0.1:2298/api/file?path=%2Fvol1%2F1000%2Fa.png',
  );
  assert.equal(
    localPathMediaUrl('https:', 'https://mdsh.zo1.top:16662', '/vol1/x.png'),
    'https://mdsh.zo1.top:16662/api/file?path=%2Fvol1%2Fx.png',
  );
});

test('destinations the Host cannot serve stay unresolved', () => {
  const http = 'http:';
  const origin = 'http://127.0.0.1:2298';
  // Non-HTTP transport (Electron file://): no request may be built.
  assert.equal(localPathMediaUrl('file:', origin, '/vol1/a.png'), undefined);
  // Protocol-relative destinations are not absolute POSIX paths.
  assert.equal(localPathMediaUrl(http, origin, '//host/vol1/a.png'), undefined);
  // Relative destinations, and the empty string.
  assert.equal(localPathMediaUrl(http, origin, 'vol1/a.png'), undefined);
  assert.equal(localPathMediaUrl(http, origin, './a.png'), undefined);
  assert.equal(localPathMediaUrl(http, origin, ''), undefined);
  // Already-absolute remote URLs are the allowlist's job, not this one.
  assert.equal(localPathMediaUrl(http, origin, 'https://example.com/a.png'), undefined);
});

test('a path with characters needing escaping is encoded', () => {
  assert.equal(
    localPathMediaUrl('http:', 'http://127.0.0.1:2298', '/vol1/工作台/图 片.png'),
    'http://127.0.0.1:2298/api/file?path=%2Fvol1%2F%E5%B7%A5%E4%BD%9C%E5%8F%B0%2F%E5%9B%BE%20%E7%89%87.png',
  );
});

/**
 * Prose file mentions.
 *
 * The reading tab composes the Host's own `chatFileMentions` resolver with its own
 * produced-path matcher: the official one wins, ours covers what it declines, and
 * either alone is used when the other is absent. This is a pure-function test of that
 * composition — the live Host side was verified separately (the shipping
 * `dsh-client-ui-deliverables` provides the service, and the official chat consumes it
 * through the same `forClosing(owner, sessionId)` call).
 */
import { composeFileMentions } from '../src/client/deliverables.ts';
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';

function resolver(known: readonly string[], labelPrefix: string): MarkdownFileMentions {
  return {
    resolve(value: string) {
      const path = known.includes(value) ? value : undefined;
      return path === undefined ? undefined
        : { open: () => {}, label: `${labelPrefix} ${path}`, title: path };
    },
  };
}

test('the official resolver wins where it answers, ours covers the rest', () => {
  const official = resolver(['src/client/Reader.tsx', 'package.json'], '官方');
  const produced = resolver(['lib/client.js'], '产物');
  const composed = composeFileMentions(official, produced);

  assert.equal(composed?.resolve('package.json')?.label, '官方 package.json');
  assert.equal(composed?.resolve('src/client/Reader.tsx')?.label, '官方 src/client/Reader.tsx');
  // Ours answers only where the official one declines.
  assert.equal(composed?.resolve('lib/client.js')?.label, '产物 lib/client.js');
  assert.equal(composed?.resolve('does/not/exist'), undefined);
});

test('whichever resolver exists is used alone', () => {
  assert.equal(composeFileMentions(undefined, undefined), undefined);
  const produced = resolver(['a.ts'], '产物');
  assert.equal(composeFileMentions(undefined, produced), produced, 'no provider: ours alone');
  const official = resolver(['b.ts'], '官方');
  assert.equal(composeFileMentions(official, undefined), official, 'nothing produced: official alone');
});
