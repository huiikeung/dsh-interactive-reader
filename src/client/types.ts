import type { ComponentType } from 'react';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { OfficialSeat } from './official-slots.js';
import type {} from '@deepseek-ai/dsh-client-ui-chat/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type { createReaderStore } from './store.js';

/**
 * Reader-owned seat for the official finalized-assistant actions.
 *
 * A component may render only the slots its own registration declares in `children`,
 * and a slot may be declared exactly once — `conversation.chat.assistant-actions` is
 * already declared by the host, so this fork cannot render or re-declare it directly.
 * The bridge in `official-actions.ts` lends that slot's contributions this seat
 * instead; it carries the official entry's own spec, so the mirrored entries resolve
 * exactly as they do in the native chat tab.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'dsh-interactive-reader.official.actions': SlotMap['conversation.chat.assistant-actions'];
  }
}

export interface ReaderBlockOwner {
  block: AssistantBlock;
  streaming: boolean;
  source: 'assistant' | 'user' | 'tool';
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Trusted installed renderers may opt in; unknown model payloads never execute code. */
    'dsh-interactive-reader.block': { kind: 'chain'; scope: 'session'; owner: ReaderBlockOwner };
  }
}

export interface ReaderInjected {
  loadOlder: () => Promise<void>;
  loadImage: (attachment: ImageAttachmentRef) => Promise<{ data: Uint8Array; mediaType: string }>;
  /**
   * Writes text into this session's composer draft via the sanctioned
   * conversation input face, with a DOM fallback. Returns true when the
   * composer accepted the text.
   */
  fillComposer: (text: string) => boolean;
  /** Open a workspace file or directory; mode comes from the Interactive Reader setting. */
  openFile: (path: string) => Promise<void> | void;
  /** Root-scoped Interactive Reader prefs (`dsh.reader.v1`), shared with Settings. */
  openPrefs?: {
    getSnapshot: () => {
      deliverableOpenMode?: import('./open-file.js').DeliverableOpenMode;
      frostedGlass?: boolean;
      foldIntensity?: import('./fold-intensity.js').FoldIntensity;
      autoFold?: boolean;
      processOnly?: boolean;
    };
    subscribe: (fn: () => void) => () => void;
    actions?: {
      setFoldIntensity?: (value: import('./fold-intensity.js').FoldIntensity) => void;
      setAutoFold?: (value: boolean) => void;
      setFrostedGlass?: (value: boolean) => void;
      setDeliverableOpenMode?: (value: import('./open-file.js').DeliverableOpenMode) => void;
      setFnosFileManagerUrl?: (value: string) => void;
    };
  };
  /**
   * Show a produced file in its folder and report what actually happened: the
   * Host's own file manager, a configured fnOS file-manager URL, or the absolute
   * folder path copied to the clipboard when the Host has no desktop.
   */
  revealFile?: (path: string) => Promise<import('./reveal.js').RevealOutcome>;
  /** Ask the Host what it can do natively; memoized, so many chips share one call. */
  probeRevealDesktop?: () => Promise<import('./reveal.js').RevealDesktop>;
  /** The configured fnOS file-manager URL template, read fresh on every reveal. */
  fnosFileManagerTemplate?: () => string;
  /** Whether the right-sidebar folder pane can be opened at all in this shell. */
  revealPaneAvailable?: () => boolean;
  /** Fork the conversation at a specific message sequence into a new branch session. */
  forkAt?: (seq: number) => void;
  /** Load session history through a target sequence number. */
  loadThrough?: (seq: unknown) => Promise<void>;
  /** Resolve a custom tool view registered in the `tool.call.toolview` slot (e.g. diff cards). */
  getToolView?: (toolName: string) => ComponentType<any> | null;
  /**
   * The Host's own prose file-mention resolver for one closing turn, when a provider
   * is installed (`dsh-client-ui-deliverables` supplies it and the official chat
   * consumes it the same way). Returns undefined wherever no provider exists, which
   * is why the reading tab keeps its own produced-path matcher as the fallback.
   */
  officialFileMentions?: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined;
  /**
   * The Host's own session-authorized image loader, exactly as the official chat
   * supplies it to its tool views and message images. The URL's lifetime is the Host's
   * business, so no object URL is ever created (or leaked) here.
   */
}
export type ReaderProps = PropsRuntime<'conversation.view'>
  & PropsLocale<'chat'>
  & PropsRenderSlots<'dsh-interactive-reader.block' | OfficialSeat>
  & PropsStore<ReturnType<typeof createReaderStore>>
  & ReaderInjected;
export type BlockRenderProps = Pick<ReaderProps, 'renderSlot' | 'renderSlotChain' | 'loadImage' | 'fillComposer' | 'getToolView'> & {
  openFile?: (path: string) => Promise<void> | void;
  revealFile?: (path: string) => Promise<import('./reveal.js').RevealOutcome>;
  /** The Host's own view of what it can open natively; shared, memoized probe. */
  probeRevealDesktop?: () => Promise<import('./reveal.js').RevealDesktop>;
  forkAt?: (seq: number) => void;
  /** Durable closing-message seq of this turn (turn-tail closing), used as the fork anchor. */
  forkSeq?: number;
  fileMentions?: MarkdownFileMentions;
  metrics?: {
    usage?: NonNullable<import('@deepseek-ai/dsh-client-ui-chat/client').TurnTailChatData['tokenUsage']>;
    runMs?: number;
    tokensPerSecond?: number;
    ttftMs?: number;
    /** Closing assistant-message time (turn-tail `closing.time`). */
    endedAt?: number;
  };
};
