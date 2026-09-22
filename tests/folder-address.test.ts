import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOLDER_ADDRESS_PREFIX,
  folderAddressOf,
  folderPathOf,
  folderTabDefinition,
  folderTabTitle,
  formatEntrySize,
  parentFolderOf,
  sortFolderEntries,
  type FolderEntry,
} from '../src/client/folder-address.js';

test('the pane address lives under the one scheme the shell routes', () => {
  // `sidebarRight.placeResource` throws for anything outside `dsh-resource://`, so the
  // prefix is a hard requirement rather than a style choice.
  assert.ok(FOLDER_ADDRESS_PREFIX.startsWith('dsh-resource://'));
  assert.equal(folderAddressOf('/vol1/1000/docs'), `${FOLDER_ADDRESS_PREFIX}%2Fvol1%2F1000%2Fdocs`);
});

test('addresses round-trip through characters that break naive URIs', () => {
  for (const path of [
    '/vol1/1000/docs',
    '/vol1/1000/工作台/插件',
    '/vol1/1000/a b/c',
    '/vol1/1000/x#y?z',
    '/vol1/1000/100%',
  ]) {
    assert.equal(folderPathOf(folderAddressOf(path)), path, path);
  }
});

test('a foreign address is refused rather than misread', () => {
  assert.equal(folderPathOf('dsh-resource://file/session/s1/a.txt'), null);
  assert.equal(folderPathOf('https://example.com/x'), null);
  assert.equal(folderPathOf(''), null);
  assert.equal(folderPathOf(`${FOLDER_ADDRESS_PREFIX}%E0%A4%A`), null, 'bad percent-encoding must not throw');
});

test('the chip names the folder', () => {
  assert.equal(folderTabTitle(folderAddressOf('/vol1/1000/工作台')), '工作台');
  assert.equal(folderTabTitle(folderAddressOf('/vol1')), 'vol1');
  assert.equal(folderTabTitle('dsh-resource://other/x'), '文件夹');
});

test('the tab definition claims exactly our addresses', () => {
  assert.equal(folderTabDefinition.id, 'dsh-interactive-reader.folder');
  assert.equal(folderTabDefinition.kind, 'interactive-reader-folder');
  assert.deepEqual(folderTabDefinition.patterns, ['dsh-resource://interactive-reader-folder/**']);
  // A third-party type's band; naming it keeps it stable if the default changes.
  assert.equal(folderTabDefinition.priority, 'extension');
  assert.equal(folderTabDefinition.canOpen(folderAddressOf('/vol1/1000')), true);
  assert.equal(folderTabDefinition.canOpen('dsh-resource://file/session/s1/a.txt'), false);
  assert.equal(folderTabDefinition.canOpen('dsh-resource://interactive-reader-folder-other/x'), false);
});

test('directories sort before files, then by a numeric-aware name order', () => {
  const entries: FolderEntry[] = [
    { name: 'b.txt', type: 'file' },
    { name: 'zdir', type: 'directory' },
    { name: 'a10', type: 'directory' },
    { name: 'a2', type: 'directory' },
    { name: 'lnk', type: 'other' },
    { name: 'a.txt', type: 'file' },
  ];
  assert.deepEqual(sortFolderEntries(entries).map(entry => entry.name),
    ['a2', 'a10', 'zdir', 'a.txt', 'b.txt', 'lnk']);
});

test('entry sizes read the way a file manager shows them', () => {
  assert.equal(formatEntrySize(0), '0 B');
  assert.equal(formatEntrySize(999), '999 B');
  assert.equal(formatEntrySize(1024), '1.0 KB');
  assert.equal(formatEntrySize(1536), '1.5 KB');
  assert.equal(formatEntrySize(1024 * 1024 * 3), '3.0 MB');
  assert.equal(formatEntrySize(1024 * 1024 * 40), '40 MB');
  assert.equal(formatEntrySize(undefined), '', 'the backend may report no size');
  assert.equal(formatEntrySize(-1), '');
  assert.equal(formatEntrySize(Number.NaN), '');
});

test('the up-target stops at the filesystem root', () => {
  assert.equal(parentFolderOf('/vol1/1000/docs'), '/vol1/1000');
  assert.equal(parentFolderOf('/vol1'), '/');
  assert.equal(parentFolderOf('/'), null);
  assert.equal(parentFolderOf('.'), null);
});
