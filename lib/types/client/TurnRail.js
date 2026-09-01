import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useId, useState } from 'react';
import css from './TurnRail.module.css';
const TURN_SPACING_PX = 10;
const RAIL_INSET_PX = 6;
function itemPosition(index, count) {
    const ratio = count <= 1 ? 0 : index / (count - 1);
    return {
        '--turn-natural-position': `${String(index * TURN_SPACING_PX)}px`,
        '--turn-position': `${String(ratio * 100)}%`,
    };
}
function railSize(count) {
    return {
        '--turn-natural-height': `${String((count - 1) * TURN_SPACING_PX + 2 * RAIL_INSET_PX)}px`,
        '--turn-rail-inset': `${String(RAIL_INSET_PX)}px`,
    };
}
function itemAtPointer(items, rail, clientY) {
    const rect = rail.getBoundingClientRect();
    const usableHeight = Math.max(1, rect.height - 2 * RAIL_INSET_PX);
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top - RAIL_INSET_PX) / usableHeight));
    return items[Math.round(ratio * (items.length - 1))];
}
function TurnRailInner({ items, activeTurn, onNavigate }) {
    const [previewTurn, setPreviewTurn] = useState(null);
    const previewId = useId();
    if (items.length < 2)
        return null;
    const previewIndex = items.findIndex(item => item.turn === previewTurn);
    const preview = previewIndex < 0 ? undefined : items[previewIndex];
    const previewPosition = previewIndex < 0 ? undefined : itemPosition(previewIndex, items.length);
    const previewAtPointer = (event) => {
        setPreviewTurn(itemAtPointer(items, event.currentTarget, event.clientY)?.turn ?? null);
    };
    const navigateAtPointer = (event) => {
        const item = itemAtPointer(items, event.currentTarget, event.clientY);
        if (item !== undefined)
            onNavigate(item);
    };
    return (_jsx("div", { className: css.slot, children: _jsxs("nav", { className: css.rail, style: railSize(items.length), "aria-label": "\u8F6E\u6B21\u5BFC\u822A", onClick: navigateAtPointer, onPointerMove: previewAtPointer, onPointerLeave: () => { setPreviewTurn(null); }, children: [_jsx("div", { className: css.marks, children: items.map((item, index) => {
                        const active = item.turn === activeTurn;
                        const showingPreview = item.turn === previewTurn;
                        const markClass = active
                            ? `${css.mark} ${css.markActive}`
                            : showingPreview ? `${css.mark} ${css.markPreview}` : css.mark;
                        return (_jsx("div", { className: css.markPosition, style: itemPosition(index, items.length), children: _jsx("button", { type: "button", className: markClass, "aria-label": `跳转到第 ${item.turn} 轮`, "aria-current": active ? 'true' : undefined, "aria-describedby": showingPreview ? previewId : undefined, onClick: (event) => { event.stopPropagation(); onNavigate(item); }, onFocus: () => { setPreviewTurn(item.turn); }, onBlur: () => { setPreviewTurn(null); } }) }, item.turn));
                    }) }), preview !== undefined && previewPosition !== undefined && (_jsxs("div", { id: previewId, role: "tooltip", className: css.preview, style: previewPosition, children: [_jsx("div", { className: css.previewPrompt, children: preview.prompt || `第 ${preview.turn} 轮` }), preview.response !== '' && _jsx("div", { className: css.previewResponse, children: preview.response })] }))] }) }));
}
/** Compact rail of the loaded Turns with hover/focus previews, mirrored from DSH's TurnNavigator. */
export const TurnRail = memo(TurnRailInner);
//# sourceMappingURL=TurnRail.js.map