import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
export interface ReaderGroup {
    key: string;
    turn: number | null;
    keys: readonly string[];
}
export interface TurnBoundary {
    status: 'open' | 'closed' | 'unknown';
    reason: string | null;
    latestStep: number;
    closingStep: number | null;
}
export declare function groupNodes(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): ReaderGroup[];
export declare function boundaryOf(turn: TurnLocation | undefined): TurnBoundary;
export declare function isEarlierNarration(data: AssistantChatData, boundary: TurnBoundary): boolean;
export declare function processExpanded(choice: boolean | undefined, boundary: TurnBoundary): boolean;
/** Reading while running must not pin the process open after completion. */
export declare function processChoiceKey(groupKey: string, boundary: TurnBoundary): string;
/** A body-only assistant step is not a thinking/process disclosure. */
export declare function hasProcessContent(node: ChatConversationViewNode | undefined, boundary: TurnBoundary): boolean;
export declare function hasVisibleBody(blocks: readonly AssistantBlock[]): boolean;
/** Keep native block order. In particular, never lift a later Think above text. */
export declare function assistantSegments(blocks: readonly AssistantBlock[]): {
    kind: 'reasoning' | 'body';
    start: number;
    blocks: AssistantBlock[];
}[];
export declare function toolFailed(block: ToolCallBlock): boolean;
export declare function toolName(block: ToolCallBlock): string;
export declare function terminalLabel(reason: string | null): string | null;
/**
 * Which running indicator the reading view must show.
 *
 * Native Chat renders one running label whenever the Session is running. This
 * view splits that label: an open turn draws its own process status, and the
 * waiting indicator covers everything the per-turn status cannot. Choosing
 * `'waiting'` is therefore the fallback for *every* running state whose last
 * turn is not open — no groups yet, the turn outside the timeline window,
 * an unknown boundary, a closed last turn while the next one starts, or a
 * brand-new Session whose nodes have not arrived. Returning `'none'` here
 * would blank the view right after sending, which reads as a dropped reply.
 *
 * @param state - running flag, awaiting-model predicate, and the last turn's status.
 * @returns `'turn'` when the last open turn draws its own status, `'waiting'` when the waiting indicator stands in, `'none'` when idle.
 */
export declare function runningIndicator(state: {
    running: boolean;
    awaitingModel: boolean;
    lastTurnStatus: 'open' | 'closed' | 'unknown' | undefined;
}): 'turn' | 'waiting' | 'none';
/**
 * Extract the first usable fork anchor seq from candidate message nodes.
 * Only the durable closing message seq cuts the intended turn prefix: an
 * absent anchor must surface as undefined (never as 0 or NaN), because the
 * host treats a missing atSeq as a whole-session fork.
 */
export declare function forkAnchorSeq(candidates: ReadonlyArray<{
    seq?: unknown;
} | null | undefined>): number | undefined;
//# sourceMappingURL=projection.d.ts.map