import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import { type FoldIntensity } from './fold-intensity.js';
import type { DeliverableOpenMode } from './open-file.js';
export interface ReaderState {
    expanded: Record<string, boolean>;
    motion: boolean;
    /** Derived from foldIntensity; kept so older persisted snapshots still read. */
    autoFold: boolean;
    /** Default stays the system app. `sidebar` is opt-in. */
    deliverableOpenMode: DeliverableOpenMode;
    /**
     * 0 = no auto-fold, 1 = current-main fold-on-next-reasoning (default),
     * 2 = process-summary mode from community PR #14.
     */
    foldIntensity: FoldIntensity;
    /** Translucent frosted chrome. Default off so opaque main chrome stays. */
    frostedGlass: boolean;
    /** Derived from foldIntensity === 2; kept for older #14 snapshots. */
    processOnly: boolean;
    /**
     * Optional fnOS file-manager URL template used by「在文件夹中显示」. Empty means
     * "always use the Host's own opener", which a headless NAS cannot honour; filling
     * it in is how a NAS user reaches a real file manager. Placeholders: `{path}`,
     * `{encodedPath}`, `{name}`.
     */
    fnosFileManagerUrl: string;
}
type ReaderActions = {
    setExpanded: (draft: ReaderState, key: string, value: boolean) => void;
    /** Drop every manual expansion, so a preference change starts from the folded state. */
    resetExpanded: (draft: ReaderState) => void;
    setMotion: (draft: ReaderState, value: boolean) => void;
    setAutoFold: (draft: ReaderState, value: boolean) => void;
    setDeliverableOpenMode: (draft: ReaderState, value: DeliverableOpenMode) => void;
    setFoldIntensity: (draft: ReaderState, value: FoldIntensity) => void;
    setFrostedGlass: (draft: ReaderState, value: boolean) => void;
    setFnosFileManagerUrl: (draft: ReaderState, value: string) => void;
};
/**
 * Declare the reader's per-session presentation store.
 *
 * The handle is the registration currency of the `conversation.view` slot's
 * store seat: `slots.register` keeps the handle and asks it for one live
 * instance per session scope, so expansion choices and the motion preference
 * follow the session and persist under `dsh.reader.v1.<sessionId>`.
 *
 * `defineStore` must come from the DSH shell's shared
 * `@deepseek-ai/dsh-client-store` seed module, never a local reimplementation.
 * The renderer's store seat calls `handle.create(scopeKey)` and reads
 * `handle.spec`; a hand-rolled handle without that shape makes the slot entry
 * throw `handle.create is not a function` the moment the tab is selected.
 */
export declare function createReaderStore(): EngineStoreHandle<ReaderState, ReaderActions>;
export {};
//# sourceMappingURL=store.d.ts.map