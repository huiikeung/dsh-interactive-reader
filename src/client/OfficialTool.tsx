import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ReactNode } from 'react';
import { OFFICIAL_SEATS, type OfficialToolOwner } from './official-slots.js';
import type { BlockRenderProps } from './types.js';

/**
 * One tool call rendered by the official `tool.call.toolview` views.
 *
 * This is not an enhancement, it is a fix: rendering a view component by hand crashed
 * with `useSessions is not a function`, because a view's own props come from
 * `PropsRuntime` — the standard session seats the platform supplies when it renders a
 * slot entry — and a hand-render passes none of them. Rendering through our seat is
 * what makes the platform supply them.
 *
 * It also brings what a hand-render cannot: the entry's injected state, its locale and
 * translations, its memo, and the recursive sub-views of the entries that declare child
 * slots (the cordis family does).
 *
 * `entryKey` selects the view registered for this tool name, exactly as the official
 * tool tree does. `fallback` is this fork's own preview, rendered when no view claims
 * the tool — so a tool nothing registers still shows its result instead of nothing.
 */
export function OfficialTool({
  renderSlot, block, toolName, cwd, loadImage, inspect, openFile, fallback,
}: Pick<BlockRenderProps, 'renderSlot' | 'openFile'> & {
  block: ToolCallBlock;
  toolName: string;
  cwd?: string;
  loadImage?: BlockRenderProps['officialImageLoader'];
  inspect?: () => void;
  fallback: ReactNode;
}) {
  const owner: OfficialToolOwner = {
    callId: block.callId,
    toolName,
    block,
    cwd,
    openFile: path => { void openFile?.(path); },
    // The Host's own session-authorized loader: the URL's lifetime is its business, so
    // no object URL is created or leaked here.
    loadImage: loadImage ?? (async () => ''),
    inspect,
  };
  return <div data-reader-tool-official>
    {renderSlot(OFFICIAL_SEATS.tools, owner, { entryKey: toolName, fallback })}
  </div>;
}
