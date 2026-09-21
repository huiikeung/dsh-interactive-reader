import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en, settingsCopyFor, zh } from '../src/client/settings-copy.ts';
import { CONVENTIONAL_SKILL_ROOTS, GENERATIVE_MCPAPPS_SKILL } from '../src/skill-status.ts';
import { shortestInstallCommand } from '../src/client/skill-status.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** User-facing surfaces must never print home/profile absolutes. */
const LEAKED_ABSOLUTE_PATH = /\/Users\/|[A-Za-z]:\\|(?:^|[\s"'`])\/home\/|\$HOME\b|\$DSH_HOME\b|~\//;

function installGuidanceSurface(): string {
  return [
    ...Object.values(en),
    ...Object.values(zh),
    shortestInstallCommand({
      packPath: '/Users/cola/plugin/skills/generative-mcpapps',
      roots: [
        { source: 'user-dsh', path: '/Users/cola/.dsh/skills' },
        { source: 'user-agents', path: 'C:\\Users\\cola\\.agents\\skills' },
      ],
    }),
    ...CONVENTIONAL_SKILL_ROOTS,
  ].join('\n');
}

test('install guidance names only relative skill roots', () => {
  const surface = installGuidanceSurface();
  assert.match(surface, /\.dsh\/skills/);
  assert.match(surface, /\.agents\/skills/);
  assert.match(surface, new RegExp(GENERATIVE_MCPAPPS_SKILL));
  assert.doesNotMatch(surface, LEAKED_ABSOLUTE_PATH);
  assert.doesNotMatch(surface, /\/Users\//);
  assert.doesNotMatch(surface, /C:\\/);
});

test('Settings dictionaries mention conventional roots and the skill folder', () => {
  for (const copy of [en, zh]) {
    const blob = `${copy.skillInstall}\n${copy.skillUnavailable}`;
    assert.match(blob, /\.dsh\/skills/);
    assert.match(blob, /\.agents\/skills/);
    assert.match(blob, /generative-mcpapps/);
    assert.doesNotMatch(blob, LEAKED_ABSOLUTE_PATH);
  }
});

test('committed Settings UI copy and command stay relative', () => {
  const client = readFileSync(resolve(root, 'lib/client.js'), 'utf8');
  const section = readFileSync(resolve(root, 'src/client/SettingsSection.tsx'), 'utf8');
  assert.match(section, /CONVENTIONAL_SKILL_ROOTS/);
  assert.doesNotMatch(section, /root\.path/);
  assert.doesNotMatch(section, /shortestInstallCommand\(skill\)/);
  assert.match(client, /\.dsh\/skills/);
  assert.match(client, /\.agents\/skills/);
  assert.doesNotMatch(client, /mkdir -p "\$DSH_HOME\/skills"/);
  assert.doesNotMatch(client, /status\.packPath \?\?/);
  assert.doesNotMatch(client, /root\.source, ": ", root\.path/);
  assert.doesNotMatch(client, /\/Users\//);
  assert.doesNotMatch(client, /C:\\\\/);
});

test('the Chinese section name is 交互阅读, not an English leftover', () => {
  // The zh dictionary used to carry 'Better Display' too, so a Chinese Host showed an
  // untranslated nav entry. The name is the plugin's Chinese identity: it is a
  // presentation of the same conversation, not an assistant.
  assert.equal(zh.nav, '交互阅读');
  assert.equal(en.nav, 'Better Display', 'the English name keeps the package identity');
  for (const copy of [zh, en]) {
    assert.notEqual(copy.nav, '');
  }
});

test('the locale dictionaries agree on every key', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
});

test('a Chinese Host resolves the Chinese name, an English Host the English one', () => {
  // This is the resolution the settings nav actually runs:
  //   locale.bind('better-display')?.('nav') || settingsCopyFor(languageTag(ctx)).nav
  // Both halves read the same dictionaries, so a Chinese Host must show 交互阅读.
  for (const tag of ['zh-CN', 'zh', 'zh-TW', 'ZH-cn']) {
    assert.equal(settingsCopyFor(tag).nav, '交互阅读', tag);
    assert.match(settingsCopyFor(tag).openTitle, /内置面板/, tag);
  }
  for (const tag of ['en-US', 'en', 'en-GB', undefined]) {
    assert.equal(settingsCopyFor(tag).nav, 'Better Display', String(tag));
  }
});
