import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { IconChevronDownOutline14, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './Reader.module.css';
const duration = (ms) => ms < 1000 ? `${Math.round(ms)} 毫秒` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} 秒`;
const stateLabel = (state) => state === 'scheduled' ? '等待重试' : state === 'started' ? '已开始' : state === 'cancelled' ? '已取消' : '记录';
/** Structured model-retry disclosure instead of the raw JSON fallback. */
export function RetryCard({ attempts }) {
    const [open, setOpen] = useState(false);
    const current = attempts[0];
    const summary = current === undefined
        ? `${attempts.length} 次尝试`
        : `第 ${current.retry} 次 · ${stateLabel(current.retryState)}`;
    return (_jsxs("div", { className: css.retry, "data-open": open || undefined, children: [_jsxs("button", { type: "button", className: css.retryHeader, "aria-expanded": open, onClick: () => setOpen(value => !value), children: [_jsx("span", { className: css.retryGlyph, children: _jsx(IconRefreshOutline14, {}) }), _jsx("span", { className: css.retryTitle, children: "\u6A21\u578B\u91CD\u8BD5\u8BB0\u5F55" }), _jsx("span", { className: css.retryMeta, children: summary }), _jsx(IconChevronDownOutline14, { className: css.retryChevron })] }), open && _jsxs("div", { className: css.retryBody, children: [attempts.length === 0 && _jsx("p", { className: css.retryEmpty, children: "\u5DF2\u91CD\u8BD5\uFF0C\u65E0\u8BE6\u7EC6\u8BB0\u5F55\u3002" }), attempts.map((attempt, index) => (_jsxs("div", { className: css.retryItem, children: [_jsxs("div", { className: css.retryItemHead, children: [_jsxs("span", { children: ["\u7B2C ", attempt.retry, " \u6B21\u5C1D\u8BD5"] }), attempt.provider && _jsx("span", { className: css.retryItemTag, children: attempt.provider }), _jsxs("span", { className: css.retryItemDelay, children: ["\u5EF6\u65F6 ", duration(attempt.delayMs)] }), _jsx("span", { className: css.retryItemState, children: stateLabel(attempt.retryState) })] }), _jsxs("div", { className: css.retryItemFailure, children: [attempt.failure?.message ?? '未知错误', attempt.failure?.code !== undefined && _jsx("span", { className: css.retryItemCode, children: String(attempt.failure.code) })] })] }, attempt.seq ?? index)))] })] }));
}
//# sourceMappingURL=RetryCard.js.map