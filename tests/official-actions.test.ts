import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mirrorOfficialActions, type MirrorRegistry } from '../src/client/official-actions.ts';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';

/**
 * Regression cover for the official-actions bridge.
 *
 * The reading tab cannot render the host's `conversation.chat.assistant-actions`
 * directly: `renderSlot` only serves slots the caller's registration declares in
 * `children`, and the slot is already declared by the host, so re-declaring it throws.
 * The bridge lends those contributions a Reader-owned seat instead. These tests pin
 * the contract that makes that safe: the official component and its registration
 * metadata travel intact, entries are disposed when they leave, and an entry that
 * declares child slots is skipped rather than mirrored into a seat that cannot host it.
 */

const SOURCE = 'conversation.chat.assistant-actions';
const SEAT = 'dsh-interactive-reader.official.actions';

/** A fake of the type-erased registry boundary the bridge is allowed to touch. */
function fakeRegistry(initial: readonly StoredEntry[] = []) {
  let entries: StoredEntry[] = [...initial];
  const listeners = new Set<() => void>();
  const registered: { options: Record<string, unknown>; component: unknown; disposed: boolean }[] = [];
  const registry: MirrorRegistry & {
    registered: typeof registered;
    setEntries(next: StoredEntry[]): void;
    sourceKey(): string;
  } = {
    registered,
    entriesOfSlot: (key: string) => (key === SOURCE ? (entries as readonly StoredEntry[]) : []),
    subscribe: (key: string, listener: () => void) => {
      assert.equal(key, SOURCE, 'the bridge subscribes to the official slot');
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    inject: (key: string, effect: () => () => void) => {
      assert.equal(key, SOURCE, 'the bridge keys off the official slot');
      return effect();
    },
    register: (options: Record<string, unknown>, component: unknown) => {
      assert.equal(options.name, SEAT, 'entries are re-registered under our own seat');
      const entry = { options, component, disposed: false };
      registered.push(entry);
      return () => { entry.disposed = true; };
    },
    setEntries(next: StoredEntry[]) {
      entries = next;
      for (const listener of [...listeners]) listener();
    },
    sourceKey: () => SOURCE,
  };
  return registry;
}

function officialEntry(overrides: Partial<StoredEntry> = {}): StoredEntry {
  return {
    options: { id: 'feedback', order: 10, locale: 'message-feedback' },
    component: function Feedback() { return null; },
    registrant: 'dsh-message-feedback',
    ...overrides,
  } as unknown as StoredEntry;
}

test('an official contribution is re-registered under our seat, unchanged', () => {
  const entry = officialEntry();
  const registry = fakeRegistry([entry]);
  const dispose = mirrorOfficialActions(registry);

  assert.equal(registry.registered.length, 1);
  const mounted = registry.registered[0];
  // Same component object and same registration metadata — only the seat is ours.
  assert.equal(mounted.component, entry.component);
  assert.equal(mounted.options.id, 'feedback');
  assert.equal(mounted.options.order, 10);
  assert.equal(mounted.options.locale, 'message-feedback');
  assert.equal(mounted.options.name, SEAT);
  // Attribution keeps the origin visible instead of implying we implemented it.
  assert.match(String(mounted.options.registrant), /^dsh-interactive-reader → dsh-message-feedback$/);

  dispose();
  assert.equal(registry.registered[0].disposed, true);
});

test('mount is incremental: an entry joining later does not remount the existing one', () => {
  const first = officialEntry();
  const registry = fakeRegistry([first]);
  const dispose = mirrorOfficialActions(registry);
  const original = registry.registered[0];

  registry.setEntries([first, officialEntry({ options: { id: 'second', order: 20 } })]);
  assert.equal(registry.registered.length, 2);
  // The first entry stayed mounted — no remount, no duplicate.
  assert.equal(registry.registered[0], original);
  assert.equal(registry.registered[0].disposed, false);
  assert.equal(registry.registered[1].options.id, 'second');

  dispose();
  assert.ok(registry.registered.every(e => e.disposed));
});

test('a contribution that leaves the source slot is disposed from our seat', () => {
  const keep = officialEntry({ options: { id: 'keep' } });
  const drop = officialEntry({ options: { id: 'drop' } });
  const registry = fakeRegistry([keep, drop]);
  const dispose = mirrorOfficialActions(registry);
  assert.equal(registry.registered.length, 2);

  registry.setEntries([keep]);
  assert.equal(registry.registered.length, 2);
  assert.equal(registry.registered[0].disposed, false);
  assert.equal(registry.registered[1].disposed, true, 'the departing entry is unmounted');

  dispose();
});

test('an entry declaring child slots is skipped, not mirrored', () => {
  const plain = officialEntry({ options: { id: 'plain' } });
  const withChildren = officialEntry({
    options: { id: 'with-children' },
    children: { 'conversation.chat.something': { kind: 'list', scope: 'session' } },
  }) as unknown as StoredEntry;
  const registry = fakeRegistry([plain, withChildren]);
  const dispose = mirrorOfficialActions(registry);

  assert.equal(registry.registered.length, 1, 'only the childless entry is lent a seat');
  assert.equal(registry.registered[0].options.id, 'plain');
  dispose();
});

test('a contribution that refuses registration does not stop the others', () => {
  const good = officialEntry({ options: { id: 'good' } });
  const bad = officialEntry({ options: { id: 'bad' } });
  const registry = fakeRegistry([good, bad]);
  // Make registration of the "bad" entry throw, the way a hostile or broken
  // contribution would.
  const baseRegister = registry.register.bind(registry) as MirrorRegistry['register'];
  (registry as unknown as { register: MirrorRegistry['register'] }).register = (options, component) => {
    if (options.id === 'bad') throw new Error('nope');
    return baseRegister(options, component);
  };
  const warnings: unknown[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  let dispose: (() => void) | undefined;
  try { dispose = mirrorOfficialActions(registry); } finally { console.warn = originalWarn; }

  assert.equal(registry.registered.length, 1, 'the good entry still mounts');
  assert.equal(registry.registered[0].options.id, 'good');
  assert.equal(warnings.length, 1, 'the failure is reported, not swallowed');
  dispose?.();
});
