import type { Context } from '@deepseek-ai/cordis';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
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
export declare function mirrorOfficialActions(registry: MirrorRegistry): () => void;
/**
 * Run the mirror for as long as the source slot is live. Called once from
 * `apply(ctx)`; the returned disposer tears down every mirrored entry.
 */
export declare function installOfficialActions(ctx: Context): () => void;
//# sourceMappingURL=official-actions.d.ts.map