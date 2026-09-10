import { Component } from 'react';
import type { ReactNode } from 'react';
import type { FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { BlockRenderProps, ReaderBlockOwner } from './types.js';
export declare class BlockBoundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state: {
        failed: boolean;
    };
    static getDerivedStateFromError(): {
        failed: boolean;
    };
    render(): string | number | boolean | Iterable<ReactNode> | import("react").JSX.Element | null | undefined;
}
export declare const ImageBlock: import("react").MemoExoticComponent<({ attachment, loadImage, compact }: {
    attachment: ImageAttachmentRef;
    loadImage: BlockRenderProps["loadImage"];
    compact?: boolean;
}) => import("react").JSX.Element>;
/**
 * One sent message's text, projected the way the native chat projects it:
 * `@file` / `@session` mentions and loaded `/skill` tokens become chips, and
 * everything else stays verbatim (never Markdown — a sent message is not an answer).
 *
 * `projectUserText` is the Host's current surface; it replaced the older
 * `MessageText` component. It is called through a guard rather than assumed, so
 * an Host that predates it still shows the text instead of failing the message.
 */
export declare function UserText({ text, sessionLabels, slashNames }: {
    text: string;
    sessionLabels?: readonly string[];
    slashNames?: readonly string[];
}): import("react").JSX.Element;
/** One sent file, as the native chat cards it: name over extension and size. */
export declare function FileCard({ attachment }: {
    attachment: FileAttachmentRef;
}): import("react").JSX.Element;
type TextPresentation = {
    startedAt?: number;
    interrupted?: boolean;
    liveText?: boolean;
};
export declare const Blocks: import("react").MemoExoticComponent<({ blocks, streaming, source, holdFormatting, startedAt, interrupted, liveText, renderSlotChain, loadImage }: BlockRenderProps & TextPresentation & {
    blocks: readonly AssistantBlock[];
    streaming?: boolean;
    source?: ReaderBlockOwner["source"];
    holdFormatting?: boolean;
}) => import("react").JSX.Element>;
export declare function CopyAnswer({ blocks }: {
    blocks: readonly AssistantBlock[];
}): import("react").JSX.Element | null;
/** Copy action for a user message, matching the native chat's clock+copy row. */
export declare function UserMessageCopy({ text, time }: {
    text: string;
    time?: number;
}): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=Blocks.d.ts.map