import { memo, useId, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import css from './TurnRail.module.css';

/** One loaded Turn projected into the rail (mirrors the host's TurnNavigationItem shape). */
export interface TurnRailItem {
  readonly turn: number;
  readonly anchorKey: string;
  readonly prompt: string;
  readonly response: string;
}

const TURN_SPACING_PX = 10;
const RAIL_INSET_PX = 6;

type TurnPositionStyle = CSSProperties & {
  readonly '--turn-natural-position': string;
  readonly '--turn-position': string;
};

type TurnRailStyle = CSSProperties & {
  readonly '--turn-natural-height': string;
  readonly '--turn-rail-inset': string;
};

function itemPosition(index: number, count: number): TurnPositionStyle {
  const ratio = count <= 1 ? 0 : index / (count - 1);
  return {
    '--turn-natural-position': `${String(index * TURN_SPACING_PX)}px`,
    '--turn-position': `${String(ratio * 100)}%`,
  };
}

function railSize(count: number): TurnRailStyle {
  return {
    '--turn-natural-height': `${String((count - 1) * TURN_SPACING_PX + 2 * RAIL_INSET_PX)}px`,
    '--turn-rail-inset': `${String(RAIL_INSET_PX)}px`,
  };
}

function itemAtPointer(items: readonly TurnRailItem[], rail: HTMLElement, clientY: number): TurnRailItem | undefined {
  const rect = rail.getBoundingClientRect();
  const usableHeight = Math.max(1, rect.height - 2 * RAIL_INSET_PX);
  const ratio = Math.max(0, Math.min(1, (clientY - rect.top - RAIL_INSET_PX) / usableHeight));
  return items[Math.round(ratio * (items.length - 1))];
}

function TurnRailInner({ items, activeTurn, onNavigate }: {
  items: readonly TurnRailItem[];
  activeTurn: number | null;
  onNavigate: (item: TurnRailItem) => void;
}) {
  const [previewTurn, setPreviewTurn] = useState<number | null>(null);
  const previewId = useId();
  if (items.length < 2) return null;
  const previewIndex = items.findIndex(item => item.turn === previewTurn);
  const preview = previewIndex < 0 ? undefined : items[previewIndex];
  const previewPosition = previewIndex < 0 ? undefined : itemPosition(previewIndex, items.length);
  const previewAtPointer = (event: PointerEvent<HTMLElement>): void => {
    setPreviewTurn(itemAtPointer(items, event.currentTarget, event.clientY)?.turn ?? null);
  };
  const navigateAtPointer = (event: MouseEvent<HTMLElement>): void => {
    const item = itemAtPointer(items, event.currentTarget, event.clientY);
    if (item !== undefined) onNavigate(item);
  };
  return (
    <div className={css.slot}>
      <nav
        className={css.rail}
        style={railSize(items.length)}
        aria-label="轮次导航"
        onClick={navigateAtPointer}
        onPointerMove={previewAtPointer}
        onPointerLeave={() => { setPreviewTurn(null); }}
      >
        <div className={css.marks}>
          {items.map((item, index) => {
            const active = item.turn === activeTurn;
            const showingPreview = item.turn === previewTurn;
            const markClass = active
              ? `${css.mark} ${css.markActive}`
              : showingPreview ? `${css.mark} ${css.markPreview}` : css.mark;
            return (
              <div key={item.turn} className={css.markPosition} style={itemPosition(index, items.length)}>
                <button
                  type="button"
                  className={markClass}
                  aria-label={`跳转到第 ${item.turn} 轮`}
                  aria-current={active ? 'true' : undefined}
                  aria-describedby={showingPreview ? previewId : undefined}
                  onClick={(event) => { event.stopPropagation(); onNavigate(item); }}
                  onFocus={() => { setPreviewTurn(item.turn); }}
                  onBlur={() => { setPreviewTurn(null); }}
                />
              </div>
            );
          })}
        </div>
        {preview !== undefined && previewPosition !== undefined && (
          <div id={previewId} role="tooltip" className={css.preview} style={previewPosition}>
            <div className={css.previewPrompt}>{preview.prompt || `第 ${preview.turn} 轮`}</div>
            {preview.response !== '' && <div className={css.previewResponse}>{preview.response}</div>}
          </div>
        )}
      </nav>
    </div>
  );
}

/** Compact rail of the loaded Turns with hover/focus previews, mirrored from DSH's TurnNavigator. */
export const TurnRail = memo(TurnRailInner);
