import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  main: string;
  scripts?: { prepare?: string };
  exports: Record<string, { default?: string } | string>;
  files: string[];
  dsh: { bundle?: { patch?: string } };
};

test('declares dsh.bundle.patch so official add joins the profile layer stack', () => {
  assert.equal(pkg.dsh.bundle?.patch, './cordis.patch.yml');
  assert.equal(existsSync(resolve(root, 'cordis.patch.yml')), true);
  const patch = readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id: dsh-better-display/);
  assert.match(patch, /name: dsh-better-display/);
  assert.equal(pkg.files.includes('cordis.patch.yml'), true);
});

test('commits compiled lib entries and does not require a prepare script', () => {
  assert.equal(pkg.scripts?.prepare, undefined);
  assert.equal(pkg.main, 'lib/dsh-better-display.js');
  const client = pkg.exports['./client'];
  assert.equal(typeof client === 'object' && client !== null ? client.default : client, './lib/client.js');
  assert.equal(existsSync(resolve(root, 'lib/dsh-better-display.js')), true);
  assert.equal(existsSync(resolve(root, 'lib/client.js')), true);
  const clientJs = readFileSync(resolve(root, 'lib/client.js'), 'utf8');
  assert.match(clientJs, /window\.__ModuleLoader__\.load/);
  assert.match(clientJs, /id:\s*"dsh-better-display"/);
  assert.match(clientJs, /settings\.section/);
  assert.match(clientJs, /deliverableOpenMode/);
  assert.match(clientJs, /\.dsh\/skills/);
  assert.doesNotMatch(clientJs, /submission\.images\.length/);
});

test('README leads with the official stock one-liner and names pnpm', () => {
  for (const name of ['README.md', 'README.en.md']) {
    const text = readFileSync(resolve(root, name), 'utf8');
    assert.match(text, /dsh plugin --profile web add github:aa2246740\/dsh-better-display/);
    assert.match(text, /pnpm/);
    assert.doesNotMatch(text, /activate-new-client/);
    assert.doesNotMatch(text, /my-plugins/);
    // The stock one-liner is the primary install path and must come first.
    // The optional in-checkout `dshx` flow is documented further down, and that
    // section is the only place allowed to name DSHX_HARNESS.
    const stockAt = text.indexOf('dsh plugin --profile web add github:');
    const checkoutAt = text.indexOf('DSHX_HARNESS');
    assert.notEqual(stockAt, -1, `${name} must document the stock install`);
    assert.ok(
      checkoutAt === -1 || checkoutAt > stockAt,
      `${name} must lead with the stock install, not the checkout flow`,
    );
  }
});
