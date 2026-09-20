/**
 * Where the turn-metrics panel goes.
 *
 * Pulled out of the component because the first version of this rule decided from the
 * space *below* the trigger and then concluded the opposite: with only 186px below, it
 * placed the panel below anyway, straight into the Host's composer band. The composer
 * paints over anything there, so the panel was cut to a 26px strip and its body read as
 * transparent with the composer's own text showing through.
 */

/** Space between the trigger and the panel, and from the panel to the viewport edge. */
export const POPUP_GAP = 8;
/** The panel's outer width: `width: 260px` plus 14px padding each side and 1px borders. */
export const POPUP_PANEL_WIDTH = 290;
/** A generous panel height: flipping early is cheaper than a cut-off panel. */
export const POPUP_ESTIMATED_HEIGHT = 320;
/** Never shrink the panel below this; a scrollbar is better than a sliver. */
export const POPUP_MIN_HEIGHT = 120;

export interface PopupLayout {
  /** Which side of the trigger the panel opens on. */
  placement: 'above' | 'below';
  /** Viewport-left of the panel, clamped inside the viewport. */
  left: number;
  /** Height cap for the chosen side, so the panel scrolls instead of being cut off. */
  maxHeight: number;
}

/**
 * Resolve the panel's side, horizontal position and height cap.
 *
 * The panel opens upward by default — that is the side the trigger's own row frees up.
 * It only flips below when the trigger sits too close to the top for the panel to fit
 * there *and* the other side genuinely has more room.
 *
 * `availableBottom` is the lowest y the panel may reach. Callers pass the Host composer
 * seat's top rather than the viewport bottom, because the composer band is not usable
 * space: it paints over anything placed there, which is what made the panel read as
 * transparent with the composer's text showing through.
 */
export function popupLayoutFor(args: {
  triggerTop: number;
  triggerBottom: number;
  triggerLeft: number;
  viewportWidth: number;
  availableBottom: number;
}): PopupLayout {
  const spaceAbove = args.triggerTop;
  const spaceBelow = Math.max(0, args.availableBottom - args.triggerBottom);
  const placement: 'above' | 'below' =
    spaceAbove < POPUP_ESTIMATED_HEIGHT && spaceBelow > spaceAbove ? 'below' : 'above';
  const left = Math.max(
    POPUP_GAP,
    Math.min(args.triggerLeft, args.viewportWidth - POPUP_PANEL_WIDTH - POPUP_GAP),
  );
  const available = (placement === 'above' ? spaceAbove : spaceBelow) - POPUP_GAP * 2;
  return { placement, left, maxHeight: Math.max(POPUP_MIN_HEIGHT, available) };
}
