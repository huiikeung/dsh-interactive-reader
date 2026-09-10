import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type * as DshChat from '@deepseek-ai/dsh-client-ui-chat/client';
import type * as DshConversation from '@deepseek-ai/dsh-client-ui-conversation/client';
import type * as DshSession from '@deepseek-ai/dsh-client-ui-session/client';
import type { createReaderStore } from './store.js';
/** References the augmentation carriers; type-only, so it emits no code. */
export type ReaderSlotCarriers = typeof DshChat | typeof DshConversation | typeof DshSession;
export interface ReaderBlockOwner {
    block: AssistantBlock;
    streaming: boolean;
    source: 'assistant' | 'user' | 'tool';
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /** Trusted installed renderers may opt in; unknown model payloads never execute code. */
        'dsh-better-display.block': {
            kind: 'chain';
            scope: 'session';
            owner: ReaderBlockOwner;
        };
    }
}
export interface ReaderInjected {
    loadOlder: () => Promise<void>;
    loadImage: (attachment: ImageAttachmentRef) => Promise<{
        data: Uint8Array;
        mediaType: string;
    }>;
    openFile?: (path: string) => Promise<void> | void;
    revealFile?: (path: string) => Promise<void> | void;
    forkAt?: (seq: number) => void;
    loadThrough?: (seq: unknown) => Promise<void>;
    fillComposer?: (text: string) => boolean;
}
export type ReaderProps = PropsRuntime<'conversation.view'> & PropsLocale<'chat'> & PropsRenderSlots<'dsh-better-display.block'> & PropsStore<ReturnType<typeof createReaderStore>> & ReaderInjected;
export type BlockRenderProps = Pick<ReaderProps, 'renderSlotChain' | 'loadImage' | 'fillComposer'> & {
    openFile?: (path: string) => Promise<void> | void;
    revealFile?: (path: string) => Promise<void> | void;
    forkAt?: (seq: number) => void;
    fileMentions?: Record<string, {
        open: () => void;
        label: string;
        title?: string;
    }>;
    metrics?: {
        usage?: {
            uncachedInputTokens: number;
            outputTokens: number;
            totalTokens: number;
            cacheReadTokens?: number;
            cacheWriteTokens?: number;
            reasoningTokens?: number;
            routes?: readonly {
                provider: string;
                model: string;
            }[];
        };
        runMs?: number;
        tokensPerSecond?: number;
        ttftMs?: number;
    };
};
//# sourceMappingURL=types.d.ts.map