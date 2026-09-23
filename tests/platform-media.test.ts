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
