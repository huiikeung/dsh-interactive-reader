#!/usr/bin/env node
/**
 * dsh-better-display — pin the settings-nav icon for this section.
 *
 * DSH renders pinned settings-section icons through a hard-coded id→icon map
 * (`navIcon(id)` in @deepseek-ai/dsh-client-ui-settings-general). The
 * `settings.section` slot contract carries no icon field — `SettingsSectionOwnerProps`
 * has only `close` — so a registrant cannot name its own glyph and every unknown id
 * falls back to `IconSettingsOutline16`, the settings gear. Getting「交互阅读」a
 * document-with-text-lines glyph therefore needs a tiny core patch.
 *
 * Idempotent; writes a `.dsh-better-display.bak` next to the file on first patch.
 * Re-run after every DSH runtime update.
 *
 * Usage: node scripts/patch-settings-icon.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Our settings.section id, and the glyph it should carry. */
const SECTION_ID = 'better-display';
const ICON = 'IconBrowseOutline16';

const candidates = [
  process.env.DSH_RUNTIME && join(process.env.DSH_RUNTIME, 'node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js'),
  // fnOS app layout on this machine
  '/vol1/@appdata/deepseek.harness/dsh-runtime/node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js',
  join(homedir(), '.dsh', 'runtime', 'node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js'),
].filter(Boolean);

const target = candidates.find((p) => existsSync(p));
if (!target) {
  console.error('[dsh-better-display] settings-general client bundle not found; set DSH_RUNTIME and re-run.');
  process.exit(1);
}

let source = readFileSync(target, 'utf8');
if (source.includes(`id === "${SECTION_ID}"`)) {
  console.log(`[dsh-better-display] settings-nav icon patch already present: ${target}`);
  process.exit(0);
}

// The gear fallback every unknown id lands on. The anchor must carry the WHOLE
// `return (0, react_jsx_runtime.jsx)(` statement: cutting it at `)(` leaves a
// dangling `jsxif (…)` and breaks the bundle.
const anchor = `return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {
\t\t\t\tclassName: SettingsRoot_module_css_default.navIcon,
\t\t\t\tsize: 16
\t\t\t});
\t\t}`;

if (!source.includes(anchor)) {
  console.error('[dsh-better-display] navIcon anchor not found (DSH bundle changed?); patch NOT applied.');
  process.exit(1);
}

const inject = `if (id === "${SECTION_ID}") return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.${ICON}, {
\t\t\t\tclassName: SettingsRoot_module_css_default.navIcon,
\t\t\t\tsize: 16
\t\t\t});
\t\t\t` + anchor;

if (!existsSync(`${target}.dsh-better-display.bak`)) copyFileSync(target, `${target}.dsh-better-display.bak`);
writeFileSync(target, source.replace(anchor, inject));

// Self-protection: this is a core shell bundle, so a bad edit would take the whole
// settings panel down. Verify the result parses and undo our own edit if it does
// not. The rollback MUST remove only this plugin's branch: restoring the whole
// .bak would also wipe every other plugin's patch to the same file (observed on
// this machine — one plugin's rollback silently reverted three others).
try {
  execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
} catch (error) {
  const reverted = readFileSync(target, 'utf8').replace(inject, anchor);
  writeFileSync(target, reverted);
  let clean = true;
  try {
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
  } catch {
    clean = false;
  }
  console.error('[dsh-better-display] patched bundle failed to parse; removed only our own branch.');
  console.error(String(error.stderr ?? error.message).split('\n').slice(0, 4).join('\n'));
  if (!clean) console.error('[dsh-better-display] warning: the file still does not parse — other plugins\' patches may be involved.');
  process.exit(1);
}

console.log(`[dsh-better-display] settings-nav icon patched: ${SECTION_ID} → ${ICON} in ${target}`);
