import { jsx as _jsx } from "react/jsx-runtime";
import { useLayoutEffect, useRef } from 'react';
/** Publish real lane geometry; wrapped labels must not collide with statistics. */
export function StickyLane({ kind, className, children }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const el = ref.current;
        const scope = el?.closest(kind === 'toolbar' ? '[data-dsh-interactive-reader]' : '[data-reader-turn]');
        if (!el || !scope)
            return;
        const property = kind === 'toolbar' ? '--reader-toolbar-height' : '--reader-status-height';
        const update = () => {
            scope.style.setProperty(property, `${el.getBoundingClientRect().height}px`);
            if (kind !== 'toolbar')
                return;
            // The status lane is sized as calc(100% - --reader-control-width), so this
            // must reserve the WHOLE control group. Measuring only the first button
            // left every later control painted over by the status lane, and summing
            // the individual widths dropped the gaps between toggles. Union the real
            // control rects so a wrapped toolbar can never yield a negative width.
            const controls = [...el.querySelectorAll('button')];
            let width = 80;
            if (controls.length > 0) {
                const rects = controls.map((control) => control.getBoundingClientRect());
                const left = Math.min(...rects.map((rect) => rect.left));
                const right = Math.max(...rects.map((rect) => rect.right));
                width = Math.max(0, right - left);
            }
            scope.style.setProperty('--reader-control-width', `${width + 28}px`);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        if (kind === 'toolbar')
            for (const control of el.querySelectorAll('button'))
                observer.observe(control);
        return () => { observer.disconnect(); scope.style.removeProperty(property); if (kind === 'toolbar')
            scope.style.removeProperty('--reader-control-width'); };
    }, [kind]);
    return _jsx("div", { ref: ref, className: className, "data-reader-lane": kind, "data-ud-check": kind === 'toolbar' ? 'reader-toolbar' : undefined, children: children });
}
//# sourceMappingURL=StickyLane.js.map