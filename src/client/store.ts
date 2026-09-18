import { defineStore } from '@deepseek-ai/dsh-client-store';
import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { DeliverableOpenMode } from './open-file.js';

export interface ReaderState {
  expanded: Record<string, boolean>;
  motion: boolean;
  autoFold: boolean;
  /** Default stays the system app. `sidebar` is opt-in. */
  deliverableOpenMode: DeliverableOpenMode;
}
type ReaderActions = {
  setExpanded: (draft: ReaderState, key: string, value: boolean) => void;
  setMotion: (draft: ReaderState, value: boolean) => void;
  setAutoFold: (draft: ReaderState, value: boolean) => void;
  setDeliverableOpenMode: (draft: ReaderState, value: DeliverableOpenMode) => void;
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
export function createReaderStore(): EngineStoreHandle<ReaderState, ReaderActions> {
  return defineStore({
    init: (): ReaderState => ({ expanded: {}, motion: true, autoFold: true, deliverableOpenMode: 'external' }),
    persist: 'dsh.reader.v1',
    actions: {
      setExpanded: (draft, key: string, value: boolean) => { draft.expanded[key] = value; },
      setMotion: (draft, value: boolean) => { draft.motion = value; },
      setAutoFold: (draft, value: boolean) => { draft.autoFold = value; },
      setDeliverableOpenMode: (draft, value: DeliverableOpenMode) => { draft.deliverableOpenMode = value; },
    },
  });
}
