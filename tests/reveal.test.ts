import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNKNOWN_DESKTOP,
  desktopFromHost,
  expandFnosTemplate,
  fileManagerName,
  fnosPathOf,
  fnosRevealUrl,
  revealFolderOf,
  revealPlanFor,
} from '../src/client/reveal.js';

/** What the official `GET /api/present.host` really answers on this headless fnOS box. */
const FNOS_DESKTOP = { name: 'MEmini-NAS', available: false, fileManager: 'directory' as const };
const MAC_DESKTOP = { name: 'mac', available: true, fileManager: 'finder' as const };
const WIN_DESKTOP = { name: 'pc', available: true, fileManager: 'explorer' as const };

test('reads the official workspaceDesktop payload', () => {
  assert.deepEqual(desktopFromHost(FNOS_DESKTOP), FNOS_DESKTOP);
  assert.deepEqual(desktopFromHost({ name: 'mac', available: true, fileManager: 'finder' }), MAC_DESKTOP);
});

test('a malformed or hostile payload degrades instead of promising an opener', () => {
  assert.deepEqual(desktopFromHost(null), UNKNOWN_DESKTOP);
  assert.deepEqual(desktopFromHost('mac'), UNKNOWN_DESKTOP);
  assert.deepEqual(desktopFromHost({}), UNKNOWN_DESKTOP);
  assert.deepEqual(desktopFromHost({ available: 'true', fileManager: 'nope' }), { name: undefined, available: false, fileManager: null });
  assert.deepEqual(desktopFromHost({ available: 1 }), { name: undefined, available: false, fileManager: null });
});

test('only the NAS volume space counts as a fnOS path', () => {
  assert.equal(fnosPathOf('/vol1/1000/深色/工作台'), '/vol1/1000/深色/工作台');
  assert.equal(fnosPathOf('/vol12/'), '/vol12');
  assert.equal(fnosPathOf('/vol1'), '/vol1');
  assert.equal(fnosPathOf('/volumes/disk'), null);
  assert.equal(fnosPathOf('/vol/1'), null);
  assert.equal(fnosPathOf('/home/me/vol1'), null);
  assert.equal(fnosPathOf('C:\\Users\\me'), null);
  assert.equal(fnosPathOf('vol1/1000'), null, 'a relative path is not a NAS address');
});

test('a template must carry a path placeholder to be usable', () => {
  assert.equal(expandFnosTemplate('', { path: '/vol1/a', name: 'a' }), null);
  assert.equal(expandFnosTemplate('   ', { path: '/vol1/a', name: 'a' }), null);
  assert.equal(
    expandFnosTemplate('http://nas:5666/v/trim.file-manager', { path: '/vol1/a', name: 'a' }),
    null,
    'no placeholder would open the file manager home and call that a reveal',
  );
});

test('placeholders expand raw, encoded and by name', () => {
  const target = { path: '/vol1/1000/工作台/插件', name: '插件' };
  assert.equal(expandFnosTemplate('http://nas:5666/v/trim.file-manager?path={path}', target),
    'http://nas:5666/v/trim.file-manager?path=/vol1/1000/工作台/插件');
  assert.equal(expandFnosTemplate('http://nas:5666/#/file?dir={encodedPath}', target),
    `http://nas:5666/#/file?dir=${encodeURIComponent('/vol1/1000/工作台/插件')}`);
  assert.equal(expandFnosTemplate('/v/trim.file-manager?name={name}&path={encodedPath}', target),
    `/v/trim.file-manager?name=${encodeURIComponent('插件')}&path=${encodeURIComponent('/vol1/1000/工作台/插件')}`);
  assert.equal(expandFnosTemplate('  http://nas:5666/?p={path}  ', target), 'http://nas:5666/?p=/vol1/1000/工作台/插件');
});

test('a configured template only applies inside the volume space', () => {
  const template = 'http://nas:5666/v/trim.file-manager?path={encodedPath}';
  assert.equal(fnosRevealUrl('/vol1/1000/docs', template),
    `http://nas:5666/v/trim.file-manager?path=${encodeURIComponent('/vol1/1000/docs')}`);
  assert.equal(fnosRevealUrl('/opt/work/docs', template), null);
  assert.equal(fnosRevealUrl('/vol1/1000/docs', ''), null);
});

test('the folder to show is the file parent', () => {
  assert.equal(revealFolderOf('/vol1/1000/a/b.txt'), '/vol1/1000/a');
  assert.equal(revealFolderOf('src/client/Reader.tsx'), 'src/client');
});

test('the label names the real file manager, never a hard-coded Finder', () => {
  assert.equal(fileManagerName('finder'), '访达');
  assert.equal(fileManagerName('explorer'), '文件资源管理器');
  assert.equal(fileManagerName('directory'), '文件管理器');
  assert.equal(fileManagerName(null), '文件管理器');
});

test('fnOS template wins, because a headless Host has no other target', () => {
  const plan = revealPlanFor({
    folderPath: '/vol1/1000/docs',
    template: 'http://nas:5666/v/trim.file-manager?path={encodedPath}',
    desktop: FNOS_DESKTOP,
  });
  assert.equal(plan.kind, 'fnos');
  assert.match(plan.label, /fnOS 文件管理器/);
});

test('without a template the plan follows the Host desktop', () => {
  const mac = revealPlanFor({ folderPath: '/Users/me/docs', template: '', desktop: MAC_DESKTOP });
  assert.equal(mac.kind, 'native');
  assert.match(mac.label, /访达/);

  const win = revealPlanFor({ folderPath: 'C:/work/docs', template: '', desktop: WIN_DESKTOP });
  assert.equal(win.kind, 'native');
  assert.match(win.label, /文件资源管理器/);

  const headless = revealPlanFor({ folderPath: '/vol1/1000/docs', template: '', desktop: FNOS_DESKTOP });
  assert.equal(headless.kind, 'copy', 'a desktop-less Host must not offer an opener it cannot honour');
  assert.match(headless.label, /没有桌面/);
  assert.match(headless.label, /MEmini-NAS/);
});

test('an un-asked desktop yields probe, so the caller can obtain one first', () => {
  const plan = revealPlanFor({ folderPath: '/vol1/1000/docs', template: '' });
  assert.equal(plan.kind, 'probe');
  assert.match(plan.label, /文件管理器/);
});

test('a template that cannot map falls through to the Host answer', () => {
  const outside = revealPlanFor({
    folderPath: '/opt/elsewhere/docs',
    template: 'http://nas:5666/v/trim.file-manager?path={path}',
    desktop: MAC_DESKTOP,
  });
  assert.equal(outside.kind, 'native', 'a non-NAS path must not be sent to the NAS');
});

test('with a pane available, a headless Host still shows the folder', () => {
  const plan = revealPlanFor({
    folderPath: '/vol1/1000/docs',
    template: '',
    desktop: FNOS_DESKTOP,
    paneAvailable: true,
  });
  assert.equal(plan.kind, 'sidebar', 'the pane is the last target that displays anything without a desktop');
  assert.match(plan.label, /右侧栏/);
});

test('a desktop Host prefers its own file manager over the pane', () => {
  assert.equal(
    revealPlanFor({ folderPath: '/Users/me/docs', template: '', desktop: MAC_DESKTOP, paneAvailable: true }).kind,
    'native',
  );
});

test('the fnOS template still outranks both the opener and the pane', () => {
  assert.equal(
    revealPlanFor({
      folderPath: '/vol1/1000/docs',
      template: 'http://nas:5666/v/trim.file-manager?path={path}',
      desktop: MAC_DESKTOP,
      paneAvailable: true,
    }).kind,
    'fnos',
  );
});
