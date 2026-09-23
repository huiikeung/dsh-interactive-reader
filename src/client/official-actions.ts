import type { Context } from '@deepseek-ai/cordis';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';

/**
 * Lend the official `conversation.chat.assistant-actions` contributions a
 * Reader-owned seat, so the reading tab can render them.
 *
 * Why a seat is unavoidable: a component may render only the slots its own
 * registration declares in `children`, `renderSlot` throws `SlotOwnershipError`
 * otherwise, and a slot may be declared exactly once —
 * `conversation.chat.assistant-actions` is already declared by the host. Re-declaring
 * it here would throw `slot "..." is already declared`. So the platform offers no way
 * to render another owner's slot directly, and a small mirror is the sanctioned route.
 *
 * What the mirror does and does not do: it copies each official entry's registration
 * metadata (id, order, locale, inject, registrant) and its component under our own
 * seat name. The platform then re-runs that entry's `inject(sessionId)` against the
 * session being read, so the official component arrives with the same injected state,
 * locale and identity it would have in the native chat tab. The official entry, its
 * declaration and its component object are never modified, and no official renderer
 * is reimplemented.
 *
 * Contributions come and go: the mirror subscribes to the source slot, mounts new
 * entries as they appear and disposes the ones that leave, so a plugin installing or
 * unloading its feedback entry later needs no change here.
 */

/** The official, host-declared slot whose entries we borrow. */
const SOURCE = 'conversation.chat.assistant-actions';
/** Our own seat, declared in the `conversation.view` registration's `children`. */
const SEAT = 'dsh-interactive-reader.official.actions';

/** The documented, type-erased registry boundary this bridge stays inside. */
export interface MirrorRegistry {
  entriesOfSlot(key: string): readonly StoredEntry[];
  subscribe(key: string, listener: () => void): () => void;
  inject(key: string, effect: () => () => void): () => void;
  register(options: Record<string, unknown>, component: unknown): () => void;
}

/**
 * Entries that declare child slots are skipped.
 *
 * A child slot can also be declared only once, so mirroring such an entry would mean
 * namespacing its children and mirroring those in turn — the whole recursive bridge.
 * The shipping feedback entry declares none. An entry that ever does is left alone and
 * simply does not appear here, which is exactly where it stood before this bridge
 * existed, so a third-party entry can never make the reading tab worse than it was.
 */
/**
 * Mirror the source slot's entries into our seat. Exported for the regression test,
 * which drives it against a fake registry rather than a live one.
 */
export function mirrorOfficialActions(registry: MirrorRegistry): () => void {
  const mounted = new Map<StoredEntry, () => void>();
  let stopped = false;

  const disposeEntry = (entry: StoredEntry, dispose: () => void) => {
    dispose();
    mounted.delete(entry);
  };

  const reconcile = () => {
    if (stopped) return;
    const entries = registry.entriesOfSlot(SOURCE);
    for (const [entry, dispose] of mounted) {
      if (!entries.includes(entry)) disposeEntry(entry, dispose);
    }
    for (const entry of entries) {
      if (mounted.has(entry)) continue;
      if (Object.keys(entry.children ?? {}).length > 0) continue;
      // Registration metadata travels with the entry; only the name becomes ours.
      const { component: _component, options, children: _children, ...metadata } = entry;
      try {
        mounted.set(entry, registry.register({
          ...options, ...metadata, name: SEAT,
          registrant: `dsh-interactive-reader → ${entry.registrant ?? SOURCE}`,
        }, entry.component));
      } catch (error) {
        // One bad contribution must not take the reader's own registration down with it.
        console.warn('[dsh-interactive-reader] could not lend an official actions entry a seat', error);
      }
    }
  };

  const unsubscribe = registry.subscribe(SOURCE, reconcile);
  const dispose = () => {
    stopped = true;
    unsubscribe();
    for (const [, stop] of [...mounted]) stop();
    mounted.clear();
  };
  try { reconcile(); } catch (error) { dispose(); throw error; }
  return dispose;
}

/**
 * Run the mirror for as long as the source slot is live. Called once from
 * `apply(ctx)`; the returned disposer tears down every mirrored entry.
 */
export function installOfficialActions(ctx: Context): () => void {
  const registry = ctx.slots as unknown as MirrorRegistry;
  const disposers: (() => void)[] = [];
  try {
    disposers.push(registry.inject(SOURCE, () => mirrorOfficialActions(registry)));
  } catch (error) {
    for (const stop of disposers.reverse()) stop();
    throw error;
  }
  return () => { for (const stop of disposers.splice(0).reverse()) stop(); };
}
