import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { AssistantBlock, ToolCallBlock, TurnLocation, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
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
/** One sent message split the way the native chat splits it. */
export interface UserContentParts {
    /** Adjacent text blocks joined with no separator: that is how providers flatten them. */
    text: string;
    images: ImageAttachmentRef[];
    files: FileAttachmentRef[];
    /** Blocks this build has no presentation for; they stay visible, never dropped. */
    rest: unknown[];
}
/**
 * Separate a sent message into bubble text and attachment rows.
 *
 * Attachments leave the bubble in the native chat, and a `file` receipt is a
 * card, not raw JSON — so the reading view reads the same durable content the
 * same way instead of falling through to the unknown-block notice.
 */
export declare function splitUserContent(content: UserMessageNode['content']): UserContentParts;
/** Map durable content blocks onto the reader's own block vocabulary. */
export declare function contentBlocks(content: UserMessageNode['content']): AssistantBlock[];
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
//# sourceMappingURL=projection.d.ts.map