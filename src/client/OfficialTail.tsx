import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client';
import { OFFICIAL_SEATS } from './official-slots.js';
import type { ReaderProps } from './types.js';

/**
 * The official turn-tail contributions, rendered at the end of a turn.
 *
 * `conversation.chat.turnTail` is a host-declared session-scoped **list** slot. Two
 * installed plugins contribute to it on this Host: the deliverables plugin's file
 * cards for explicit `present` artifacts, and the plan plugin's review row. Rendering
 * the mirror is therefore the whole feature — the reading tab shows what the native
 * chat tab shows at the tail of a turn.
 *
 * `readerProducedPaths` are the paths this fork's own chip row already presents. The
 * mirror's wrapper filters them out of the official cards' `produced` set, so a path we
 * already show with our copy / reveal / open-mode actions is not shown a second time by
 * the official cards. See `producedPathTailMatch`.
 */
export function OfficialTail({
  renderSlot, turn, seq, openFile, producedPaths,
}: Pick<ReaderProps, 'renderSlot'> & {
  turn: TurnTailOwnerProps['turn'];
  seq: number;
  openFile?: (path: string) => void;
  producedPaths: readonly string[];
}) {
  const owner: TurnTailOwnerProps & { readerProducedPaths: readonly string[] } = {
    turn,
    seq,
    openFile: path => { void openFile?.(path); },
    readerProducedPaths: producedPaths,
  };
  return <div data-reader-official-tail style={{ display: 'contents' }}>
    {renderSlot(OFFICIAL_SEATS.tail, owner)}
  </div>;
}
