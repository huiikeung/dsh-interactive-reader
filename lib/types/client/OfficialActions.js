import { jsx as _jsx } from "react/jsx-runtime";
import { OFFICIAL_SEATS } from './official-slots.js';
/**
 * The official finalized-assistant actions, rendered inside the reading tab's own
 * answer row.
 *
 * `conversation.chat.assistant-actions` is a host-declared session-scoped **list**
 * slot: the feedback plugin contributes thumbs-up / thumbs-down to it, and anything
 * else registered there later contributes too. Rendering its mirror (our own seat,
 * see `official-actions.ts`) is therefore the whole feature — the reading tab shows
 * what the native chat tab shows, and this fork implements none of that UI.
 *
 * Our own copy / fork / metrics buttons stay ours and sit in the same flex row, the
 * way the official turn-tail composes its own icons with `extraActions`.
 *
 * `messageId` is the durable identity of the closing assistant message
 * (`closing.finalNode.messageId`). It is absent only on a synthetic interruption
 * fallback assembled from chunks with no durable message; those render nothing
 * instead of inventing an identity — the rule the official turn-tail applies too.
 */
export function OfficialActions({ renderSlot, messageId }) {
    if (messageId === undefined)
        return null;
    return _jsx("span", { "data-reader-official-actions": true, style: { display: 'contents' }, children: renderSlot(OFFICIAL_SEATS.actions, { messageId }) });
}
//# sourceMappingURL=OfficialActions.js.map