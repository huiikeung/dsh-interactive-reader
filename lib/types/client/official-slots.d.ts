import type { Context } from '@deepseek-ai/cordis';
import type { SlotEntryDef, SlotMap, SlotSpec, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
import type { ToolCallBlock, MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { OpenFileOptions } from '@deepseek-ai/dsh-client-ui-chat/client';
/**
 * Composition adapter for the Host's own renderers.
 *
 * A component may render only the slots its own registration declares in `children`,
 * `renderSlot` throws `SlotOwnershipError` otherwise, and a slot may be declared
 * exactly once — every slot here is already declared by the host, so re-declaring it
 * throws `slot "..." is already declared`. The platform therefore gives a plugin no
 * way to render another owner's slot, and the only sanctioned route is to lend that
 * slot's contributions a seat of our own.
 *
 * Only public registry operations are used: `spec`, `entriesOfSlot`, `subscribe`,
 * `inject`, `register`. Original entries, declarations and components are never
 * modified, no official source is imported privately, and no official renderer is
 * reimplemented — the platform still binds injection, hooks, locale, stores and
 * boundaries, and re-runs each entry's `inject(sessionId)` against the session being
 * read.
 *
 * Child seats are uniquely named because a sub-slot has exactly one declarer, and a
 * second declarer of the same key throws at load. The thin component wrapper below
 * translates an entry's declared child names before delegating to the framework's own
 * `renderSlot`; it does not implement a slot renderer.
 */
/** Host-declared slots this reader borrows, and the Reader-owned seats it renders them in. */
declare const FAMILIES: {
    readonly actions: "conversation.chat.assistant-actions";
    readonly tools: "tool.call.toolview";
};
export type OfficialFamily = keyof typeof FAMILIES;
export declare const OFFICIAL_SEATS: {
    readonly actions: "dsh-interactive-reader.official.actions/conversation.chat.assistant-actions";
    readonly tools: "dsh-interactive-reader.official.tools/tool.call.toolview";
};
export type OfficialSeat = typeof OFFICIAL_SEATS[OfficialFamily];
/** Seat name for the mirrored copies of `source`'s contributions. */
export declare const officialSeat: (family: OfficialFamily, source?: string) => string;
/**
 * The official `tool.call.toolview` owner share, mirrored structurally.
 *
 * `@deepseek-ai/dsh-client-ui-tool` is deliberately not a dependency: it carries the
 * whole tool-UI layer, and a profile that installs no tool view should not be made to
 * depend on it. Every type it needs is re-exported by packages we already depend on,
 * so this mirror keeps the render site type-checked — passing a wrong owner prop is
 * the real risk here, and this keeps it a compile error. If the official owner ever
 * grows a field, this is where it must be added.
 *
 * The rest of a tool view's props (`useSessions`, `useSession`, the standard session
 * seats) come from `PropsRuntime` and are supplied by the platform, not by us — which
 * is precisely why rendering a view component by hand crashed: it was handed four
 * props and asked for `useSessions`.
 */
export interface OfficialToolOwner {
    callId: string;
    toolName: string;
    block: ToolCallBlock;
    cwd?: string | undefined;
    home?: string | undefined;
    openFile: (path: string, options?: OpenFileOptions) => void;
    loadImage: MessageImageLoader;
    inspect?: (() => void) | undefined;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'dsh-interactive-reader.official.actions/conversation.chat.assistant-actions': SlotMap['conversation.chat.assistant-actions'];
        'dsh-interactive-reader.official.tools/tool.call.toolview': SlotEntryDef & {
            kind: 'keyed';
            scope: 'session';
            owner: OfficialToolOwner;
        };
    }
}
/** The documented, type-erased registry inspection/registration boundary. */
export interface CompositionRegistry {
    spec(key: string): SlotSpec<SlotEntryDef> | undefined;
    entriesOfSlot(key: string): readonly StoredEntry[];
    subscribe(key: string, listener: () => void): () => void;
    inject(key: string, effect: () => () => void): () => void;
    register(options: Record<string, unknown>, component: unknown): () => void;
}
/**
 * The `children` table for our `conversation.view` registration: one seat per family
 * we render, carrying the live spec of the slot it mirrors.
 */
export declare function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): {
    [K in OfficialSeat]: SlotSpec<SlotMap[K]>;
};
/**
 * Mirror one slot's contribution set incrementally.
 *
 * Unrelated additions do not remount existing entries or recreate their subscriptions;
 * a source unload / HMR disposes the corresponding subtree and its closures before a
 * replacement. Child slots are mirrored recursively under namespaced seats, which is
 * what lets a contribution that declares children keep rendering them.
 */
export declare function mirrorOfficialSlot(slots: CompositionRegistry, source: string, target: string, namespace: string, accept?: (entry: StoredEntry) => boolean): () => void;
/**
 * Run every mirror for as long as its source is live. Called from inside our
 * `conversation.view` registration — *after* it, because a slot may only be registered
 * into by an entry whose parent declared it, and running this earlier fails with
 * "a parent entry's children table must declare it".
 *
 * One family failing must not take the reading tab down with it, so each is isolated
 * and the reason is named.
 */
export declare function installOfficialSlots(ctx: Context): () => void;
export {};
//# sourceMappingURL=official-slots.d.ts.map