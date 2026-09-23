import { defineStore } from '@deepseek-ai/dsh-client-store';
import { FOLD_INTENSITY_DEFAULT, autoFoldFromIntensity, processOnlyFromIntensity, } from './fold-intensity.js';
function applyFoldIntensity(draft, value) {
    draft.foldIntensity = value;
    draft.autoFold = autoFoldFromIntensity(value);
    draft.processOnly = processOnlyFromIntensity(value);
}
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
export function createReaderStore() {
    return defineStore({
        init: () => ({
            expanded: {},
            motion: true,
            autoFold: true,
            deliverableOpenMode: 'external',
            foldIntensity: FOLD_INTENSITY_DEFAULT,
            frostedGlass: false,
            processOnly: false,
            fnosFileManagerUrl: '',
        }),
        persist: 'dsh.reader.v1',
        actions: {
            setExpanded: (draft, key, value) => { draft.expanded[key] = value; },
            resetExpanded: draft => { draft.expanded = {}; },
            setMotion: (draft, value) => { draft.motion = value; },
            setAutoFold: (draft, value) => {
                applyFoldIntensity(draft, value
                    ? (draft.foldIntensity === 2 ? 2 : 1)
                    : 0);
            },
            setDeliverableOpenMode: (draft, value) => { draft.deliverableOpenMode = value; },
            setFoldIntensity: (draft, value) => { applyFoldIntensity(draft, value); },
            setFrostedGlass: (draft, value) => { draft.frostedGlass = value; },
            setFnosFileManagerUrl: (draft, value) => { draft.fnosFileManagerUrl = value; },
        },
    });
}
//# sourceMappingURL=store.js.map