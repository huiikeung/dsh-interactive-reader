import type { ChatNodeOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ReactNode } from 'react';
import { OFFICIAL_SEATS } from './official-slots.js';
import type { BlockRenderProps, ReaderInjected } from './types.js';

/**
 * A node kind this reader does not present itself, rendered by the official renderer.
 *
 * The reader presents every node kind a stock Host registers — the user message, the
 * assistant steps, tool calls, commands, compactions, retries, turn errors and
 * max-token stops. The one kind left is `unknown`, which the Host registers as the
 * forward-compatibility path: it fires when a node kind has *no* renderer, which on this
 * Host means one contributed by a plugin or a future version this fork has never seen.
 * Rendering its mirror is therefore the whole feature — such a node appears the way the
 * native chat tab shows it instead of as a raw record.
 *
 * `entryKey` selects the renderer registered for this node kind. `fallback` keeps this
 * fork's own "kind not yet supported" block, so a kind nothing claims still shows its
 * record rather than nothing.
 *
 * Two owner props cannot be supplied honestly here: `openSkill` and
 * `renderMessageImages`. The former belongs to the message-skill surface the native chat
 * owns, and the latter would need the attachment presentation slot, which is a separate
 * family this reader does not render. They are passed as inert rather than guessed at,
 * so a node that needs them degrades instead of misbehaving — the record and the
 * fallback still show.
 */
export function OfficialNode({
  renderSlot, node, cwd, openFile, inspectCall, forkAt, loadImage, officialFileMentions, fallback,
}: Pick<BlockRenderProps, 'renderSlot' | 'openFile' | 'forkAt'> & {
  node: ChatConversationViewNode;
  cwd?: string;
  inspectCall?: (callId: string) => void;
  loadImage?: BlockRenderProps['officialImageLoader'];
  officialFileMentions?: (owner: Parameters<ChatNodeOwnerProps['fileMentions']>[0]) => ReturnType<ChatNodeOwnerProps['fileMentions']>;
  fallback: ReactNode;
}) {
  const owner: ChatNodeOwnerProps & { node: ChatConversationViewNode } = {
    cwd,
    openSkill: () => {},
    openFile: path => { void openFile?.(path); },
    inspectCall: callId => { inspectCall?.(callId); },
    forkAt: seq => { void forkAt?.(seq); },
    loadImage: loadImage ?? (async () => ''),
    renderMessageImages: () => null,
    fileMentions: owner => officialFileMentions?.(owner as never),
    node,
  };
  // The runtime node domain is open while the public SlotMap enumerates the known
  // kinds, so this seat is dispatched through the same type-erased boundary the mirror
  // itself uses. `entryKey` is the node kind and `owner.node` carries it, exactly as the
  // official chat node tree does.
  const renderNode = renderSlot as unknown as (key: string, owner: object, options: object) => ReactNode;
  return <div data-reader-official-node={node.kind} data-chat-anchor-key={node.key}>
    {renderNode(OFFICIAL_SEATS.nodes, owner, { entryKey: node.kind, fallback })}
  </div>;
}
