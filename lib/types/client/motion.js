import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import css from './Reader.module.css';
import { StreamMotionContext } from './streaming.js';
const EASING = 'cubic-bezier(.22,1,.36,1)';
export function useMotionAllowed(enabled) {
    const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const change = () => setReduced(query.matches);
        query.addEventListener('change', change);
        return () => query.removeEventListener('change', change);
    }, []);
    return enabled && !reduced;
}
export function usePinnedSelection(root, selector = '[data-reader-answer], [data-reader-process]') {
    const [keys, setKeys] = useState([]);
    useEffect(() => {
        const update = () => {
            const selection = document.getSelection();
            const range = selection && !selection.isCollapsed && selection.rangeCount ? selection.getRangeAt(0) : null;
            const next = range && root.current
                ? [...new Set(Array.from(root.current.querySelectorAll(selector))
                        .filter(element => range.intersectsNode(element))
                        .map(element => element.dataset.readerKey ?? element.dataset.readerProcessKey).filter(Boolean))]
                : [];
            setKeys(previous => previous.length === next.length && previous.every((key, index) => key === next[index]) ? previous : next);
        };
        document.addEventListener('selectionchange', update);
        return () => document.removeEventListener('selectionchange', update);
    }, [root, selector]);
    return keys;
}
export function StatusText({ text, motion, shimmer = false }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => !document.hidden);
    const [forcedColors, setForcedColors] = useState(() => window.matchMedia('(forced-colors: active)').matches);
    const allowed = motion && visible && !forcedColors;
    const [frame, setFrame] = useState({ text, id: 0, phase: 'idle', outgoing: null });
    // Adjust before commit, so a new label cannot paint once before its entry state.
    // Reuse the previous incoming key: a rapid change exits from its current pose.
    if (frame.text !== text)
        setFrame({
            text, id: frame.id + 1, phase: allowed ? 'start' : 'idle',
            outgoing: allowed ? { text: frame.text, id: frame.id } : null,
        });
    useEffect(() => {
        const update = () => setVisible(!document.hidden);
        const query = window.matchMedia('(forced-colors: active)');
        const colors = () => setForcedColors(query.matches);
        document.addEventListener('visibilitychange', update);
        query.addEventListener('change', colors);
        return () => { document.removeEventListener('visibilitychange', update); query.removeEventListener('change', colors); };
    }, []);
    useLayoutEffect(() => {
        const id = frame.id;
        const settle = () => setFrame(current => current.id === id && current.outgoing
            ? { ...current, phase: 'idle', outgoing: null } : current);
        if (!allowed) {
            settle();
            return;
        }
        if (!frame.outgoing || !ref.current)
            return;
        // Commit the supplied .is-enter-start pose before releasing CSS transitions.
        ref.current.getBoundingClientRect();
        let timer = 0;
        const tick = requestAnimationFrame(() => {
            setFrame(current => current.id === id ? { ...current, phase: 'running' } : current);
            timer = window.setTimeout(settle, 200); // 150ms swap + 50ms incoming gap.
        });
        return () => { cancelAnimationFrame(tick); window.clearTimeout(timer); };
    }, [frame.id, allowed]);
    const active = shimmer && allowed;
    const swapping = allowed && frame.outgoing !== null;
    return _jsxs("span", { className: css.statusText, "data-reader-status": true, "data-reader-busy": shimmer, "data-ud-check": "reader-status", children: [_jsxs("span", { className: css.think, "aria-hidden": "true", "data-active": active, "data-reader-status-phase": swapping ? frame.phase : 'idle', "data-ud-motion": "reader-thinking-state", children: [_jsx("span", { className: css.thinkSizer, children: text }), swapping && _jsx("span", { className: `${css.thinkText} ${frame.phase === 'running' ? css.isExit : ''}`, "data-reader-status-copy": "outgoing", "data-text": frame.outgoing.text, children: frame.outgoing.text }, frame.outgoing.id), _jsx("span", { ref: ref, className: `${css.thinkText} ${swapping && frame.phase === 'start' ? css.isEnterStart : ''}`, "data-reader-status-copy": "current", "data-reader-shimmer": active || undefined, "data-text": text, children: text }, frame.id)] }), _jsx("span", { className: css.srOnly, role: "status", "aria-live": "polite", "aria-atomic": "true", children: text })] });
}
export function Disclosure({ open, onChange, label, status, controls, buttonRef }) {
    return _jsxs("div", { className: css.disclosure, "data-reader-disclosure": true, "data-expanded": open, children: [_jsxs("button", { ref: buttonRef, type: "button", className: css.disclosureButton, "aria-label": `${open ? '收起' : '展开'}思考与过程`, "aria-expanded": open, "aria-controls": controls, onClick: () => onChange(!open), children: [label, _jsx("svg", { className: css.chevron, "data-open": open, viewBox: "0 0 16 16", width: "12", height: "12", "aria-hidden": "true", children: _jsx("path", { d: "m6 4 4 4-4 4" }) })] }), _jsx("div", { className: css.processMeta, "data-reader-process-meta": true, "data-open": open, "aria-hidden": !open, children: _jsx("div", { className: css.processMetaInner, children: _jsxs("div", { className: css.processMetaLine, children: [_jsx("span", { children: "\u601D\u8003\u4E0E\u8FC7\u7A0B" }), status && _jsx("span", { className: css.meta, children: status })] }) }) })] });
}
/** Supplemental details stay in source order beside their own narration. */
export function ProcessFragment({ open, motion, onRead, returnFocusTo, nodeKey, children, framed = false }) {
    const body = useRef(null);
    const running = useRef(null);
    const previous = useRef(open);
    const [present, setPresent] = useState(open);
    useLayoutEffect(() => {
        const element = body.current;
        if (!element)
            return;
        const from = running.current ? element.getBoundingClientRect().height : previous.current ? element.scrollHeight : 0;
        running.current?.cancel();
        running.current = null;
        const changed = previous.current !== open;
        previous.current = open;
        if (open)
            setPresent(true);
        if (!open && element.contains(document.activeElement))
            returnFocusTo.current?.focus();
        element.style.height = open ? 'auto' : '0px';
        const target = open ? element.scrollHeight : 0;
        if (!motion || !changed || Math.abs(from - target) < 1) {
            setPresent(open);
            return;
        }
        const animation = element.animate([{ height: `${from}px` }, { height: `${target}px` }], { duration: 260, easing: EASING, fill: 'both' });
        running.current = animation;
        animation.onfinish = () => {
            if (running.current !== animation)
                return;
            running.current = null;
            animation.cancel();
            setPresent(open);
        };
    }, [open, motion, returnFocusTo]);
    useEffect(() => () => { running.current?.cancel(); }, []);
    if (!open && !present)
        return null;
    return _jsx("div", { ref: body, className: css.disclosureBody, "data-reader-process": true, "data-reader-process-key": nodeKey, "data-ud-motion": "reader-process-size", "aria-hidden": !open, onPointerDown: () => { if (open)
            onRead(); }, onFocusCapture: () => { if (open)
            onRead(); }, ...(!open ? { inert: '' } : {}), children: _jsx("div", { className: framed ? css.processFrame : css.processContents, children: children }) });
}
/** Retire only narration that was actually visible; historical rows stay folded. */
export function RetiringContent({ visible, children }) {
    const { enabled } = useContext(StreamMotionContext);
    const root = useRef(null);
    const animation = useRef(null);
    const [present, setPresent] = useState(visible);
    const [focusHeld, setFocusHeld] = useState(false);
    useLayoutEffect(() => {
        const element = root.current;
        if (visible) {
            animation.current?.cancel();
            animation.current = null;
            setPresent(true);
            return;
        }
        if (!element)
            return;
        if (element.contains(document.activeElement)) {
            setFocusHeld(true);
            return;
        }
        if (focusHeld)
            return;
        const from = element.getBoundingClientRect().height;
        animation.current?.cancel();
        animation.current = null;
        if (!enabled || from < 1) {
            setPresent(false);
            return;
        }
        const next = element.animate([{ height: `${from}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: EASING, fill: 'both' });
        animation.current = next;
        next.onfinish = () => { if (animation.current === next) {
            animation.current = null;
            next.cancel();
            setPresent(false);
        } };
    }, [visible, enabled, focusHeld]);
    useEffect(() => () => animation.current?.cancel(), []);
    if (!visible && !present)
        return null;
    return _jsx("div", { ref: root, className: css.retiringContent, "data-reader-retiring": visible ? 'visible' : 'retiring', "data-ud-motion": "reader-progress-retire", onBlur: event => { if (!event.currentTarget.contains(event.relatedTarget))
            setFocusHeld(false); }, children: children });
}
// DOM-only behavior: the native Session remains the sole source of business data.
export function useReadingScroll(root, motion) {
    const port = useRef(null);
    const following = useRef(true);
    const anchor = useRef(null);
    const [detached, setDetached] = useState(false);
    useLayoutEffect(() => {
        const content = root.current;
        if (!content)
            return;
        const scroll = content.closest('[data-conversation-scroll]') ?? content;
        port.current = scroll;
        let followFrame = 0;
        let lastFrameAt = 0;
        let lastWrittenTop = null;
        const selected = () => {
            const selection = document.getSelection();
            return selection && !selection.isCollapsed && selection.anchorNode && content.contains(selection.anchorNode);
        };
        const capture = () => {
            const top = scroll.getBoundingClientRect().top;
            const candidate = Array.from(content.querySelectorAll('[data-reader-anchor]')).find(element => element.getBoundingClientRect().bottom > top + 8);
            anchor.current = candidate ? { element: candidate, top: candidate.getBoundingClientRect().top } : null;
        };
        const onScroll = () => {
            // While a follow animation is actively driving scroll, do not cancel following midway.
            if (followFrame !== 0)
                return;
            // Our easing frames must not be mistaken for a user leaving the bottom.
            if (lastWrittenTop !== null && Math.abs(scroll.scrollTop - lastWrittenTop) < 1)
                return;
            const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 72;
            following.current = atBottom;
            setDetached(!atBottom);
            if (!atBottom) {
                cancelAnimationFrame(followFrame);
                followFrame = 0;
            }
            capture();
        };
        const onWheel = (event) => {
            cancelAnimationFrame(followFrame);
            followFrame = 0;
            lastWrittenTop = null;
            if (event.deltaY < 0) {
                following.current = false;
                setDetached(true);
                capture();
            }
        };
        const onTouch = () => {
            cancelAnimationFrame(followFrame);
            followFrame = 0;
            lastWrittenTop = null;
        };
        const onKey = (event) => {
            if (event.target instanceof HTMLElement && event.target.closest('textarea,input,[contenteditable=true]'))
                return;
            if (['PageUp', 'Home', 'ArrowUp'].includes(event.key)) {
                cancelAnimationFrame(followFrame);
                followFrame = 0;
                lastWrittenTop = null;
                following.current = false;
                setDetached(true);
                capture();
            }
        };
        const writeTop = (top) => { scroll.scrollTop = top; lastWrittenTop = scroll.scrollTop; };
        const follow = (now) => {
            followFrame = 0;
            if (!following.current || selected() || content.contains(document.activeElement))
                return;
            const gap = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
            const delta = Math.min(48, Math.max(1, now - lastFrameAt));
            lastFrameAt = now;
            if (!motion || Math.abs(gap) < 1.5) {
                writeTop(scroll.scrollHeight);
                capture();
                return;
            }
            writeTop(scroll.scrollTop + gap * (1 - Math.exp(-delta / 52)));
            followFrame = requestAnimationFrame(follow);
        };
        const firstFrame = requestAnimationFrame(() => {
            if (following.current && !selected())
                writeTop(scroll.scrollHeight);
            capture();
        });
        const observer = new ResizeObserver(() => {
            if (selected())
                return;
            if (following.current && !content.contains(document.activeElement)) {
                if (!motion)
                    writeTop(scroll.scrollHeight);
                else if (!followFrame) {
                    lastFrameAt = performance.now();
                    followFrame = requestAnimationFrame(follow);
                }
            }
            else if (!following.current && anchor.current?.element.isConnected) {
                const delta = anchor.current.element.getBoundingClientRect().top - anchor.current.top;
                if (Math.abs(delta) > .5)
                    writeTop(scroll.scrollTop + delta);
            }
            capture();
        });
        observer.observe(content);
        if (scroll !== content)
            observer.observe(scroll);
        scroll.addEventListener('scroll', onScroll, { passive: true });
        scroll.addEventListener('wheel', onWheel, { passive: true });
        scroll.addEventListener('touchstart', onTouch, { passive: true });
        scroll.addEventListener('touchmove', onTouch, { passive: true });
        scroll.addEventListener('keydown', onKey);
        return () => {
            cancelAnimationFrame(firstFrame);
            cancelAnimationFrame(followFrame);
            observer.disconnect();
            scroll.removeEventListener('scroll', onScroll);
            scroll.removeEventListener('wheel', onWheel);
            scroll.removeEventListener('touchstart', onTouch);
            scroll.removeEventListener('touchmove', onTouch);
            scroll.removeEventListener('keydown', onKey);
        };
    }, [root, motion]);
    const jump = useCallback(() => {
        anchor.current = null;
        following.current = true;
        setDetached(false);
        if (port.current) {
            port.current.scrollTop = port.current.scrollHeight;
        }
    }, []);
    return { detached, jump };
}
//# sourceMappingURL=motion.js.map