import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  main: string;
  repository?: { url?: string };
  scripts?: { prepare?: string };
  exports: Record<string, { default?: string } | string>;
  files: string[];
  dsh: { bundle?: { patch?: string } };
  peerDependencies: Record<string, string>;
};

// This fork runs on two Harnesses at once: 0.1.7-rc.2 is the local type baseline
// (tsconfig paths point at the 0.1.7 types) and 0.2.1-alpha.1 is the runtime the
// host actually boots. The explicit `0.2.1-alpha.1` comparator is load-bearing:
// node-semver only matches a prerelease against a comparator with the same
// major.minor.patch tuple, so `>=0.2.0-rc.1 <0.3.0-0` alone would NOT accept the
// alpha this fork has to load on.
const HARNESS_PEER = '>=0.1.7-rc.1 <0.1.8 || >=0.2.0-rc.1 <0.3.0-0 || 0.2.1-alpha.1';

test('DSH peer range covers every Harness this fork supports', () => {
  const peers = Object.entries(pkg.peerDependencies).filter(([name]) => name.startsWith('@deepseek-ai/dsh-'));
  assert.ok(peers.length >= 12);
  for (const [name, range] of peers) {
    assert.equal(range, HARNESS_PEER, name);
    assert.equal(semver.satisfies('0.1.7-rc.2', range), true, name);
    assert.equal(semver.satisfies('0.2.0-rc.2', range), true, name);
    assert.equal(semver.satisfies('0.2.1-alpha.1', range), true, name);
    assert.equal(semver.satisfies('0.2.1', range), true, name);
    assert.equal(semver.satisfies('0.1.6', range), false, name);
    assert.equal(semver.satisfies('0.3.0', range), false, name);
  }
});

test('declares dsh.bundle.patch so official add joins the profile layer stack', () => {
  assert.equal(pkg.dsh.bundle?.patch, './cordis.patch.yml');
  assert.equal(existsSync(resolve(root, 'cordis.patch.yml')), true);
  const patch = readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id: dsh-interactive-reader/);
  assert.match(patch, /name: dsh-interactive-reader/);
  assert.equal(pkg.files.includes('cordis.patch.yml'), true);
});

test('commits compiled lib entries and does not require a prepare script', () => {
  assert.equal(pkg.scripts?.prepare, undefined);
  assert.equal(pkg.main, 'lib/dsh-interactive-reader.js');
  const client = pkg.exports['./client'];
  assert.equal(typeof client === 'object' && client !== null ? client.default : client, './lib/client.js');
  assert.equal(existsSync(resolve(root, 'lib/dsh-interactive-reader.js')), true);
  assert.equal(existsSync(resolve(root, 'lib/client.js')), true);
  const clientJs = readFileSync(resolve(root, 'lib/client.js'), 'utf8');
  assert.match(clientJs, /window\.__ModuleLoader__\.load/);
  assert.match(clientJs, /id:\s*"dsh-interactive-reader"/);
  assert.match(clientJs, /settings\.section/);
  assert.match(clientJs, /deliverableOpenMode/);
  assert.match(clientJs, /frostedGlass/);
  assert.match(clientJs, /foldIntensity/);
  assert.match(clientJs, /setFrostedGlass/);
  assert.match(clientJs, /setFoldIntensity/);
  assert.match(clientJs, /data-reader-glass/);
  assert.match(clientJs, /modeFromSnapshot/);
  assert.match(clientJs, /str_replace_editor/);
  assert.doesNotMatch(clientJs, /只折叠过程/);
  assert.match(clientJs, /\.dsh\/skills/);
  assert.doesNotMatch(clientJs, /submission\.images\.length/);
});

test('README leads with the official stock one-liner and names pnpm', () => {
  // Derived from package.json rather than hard-coded: this is a fork of
  // aa2246740/dsh-better-display and has been renamed, so a literal owner would go
  // stale the moment either changes. The install line must point at THIS repo.
  const slug = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(pkg.repository?.url ?? '')?.[1];
  assert.ok(slug, 'package.json must name a GitHub repository');
  for (const name of ['README.md', 'README.en.md']) {
    const text = readFileSync(resolve(root, name), 'utf8');
    assert.match(text, new RegExp(`dsh plugin --profile web add github:${slug!.replace(/[./]/, '\\$&')}`));
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
