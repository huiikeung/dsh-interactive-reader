import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import css from './Reader.module.css';
const retrySeconds = (ms) => Math.max(1, Math.ceil(ms / 1_000));
const maximum = (node) => (node.mode === 'normal' ? node.maxRetries : '∞');
const stateLabel = (state) => state === 'scheduled' ? '等待重试模型请求' : state === 'started' ? '已重试模型请求' : state === 'cancelled' ? '模型请求重试已取消' : '模型请求重试';
const failureMessage = (message, code) => (code === 'AUTH' ? 'API 密钥无效' : message ?? '未知错误');
/** Native-style model-retry disclosure, mirroring DSH's default renderer: a quiet `details` row. */
export const RetryItem = memo(function RetryItem({ node }) {
    const active = node.retryState === 'scheduled';
    const label = active ? '正在重试模型请求' : stateLabel(node.retryState);
    const max = maximum(node);
    const secs = retrySeconds(node.delayMs);
    return (_jsxs("details", { className: css.retryRow, "data-active": active || undefined, "data-reader-anchor": true, children: [_jsx("summary", { className: css.retrySummary, children: _jsxs("span", { className: css.retryText, role: "status", children: [label, "\uFF08", node.retry, "/", max, "\uFF09 \u00B7 ", secs, "s"] }) }), _jsxs("div", { className: css.retryDetails, children: [_jsxs("div", { children: [_jsx("span", { className: css.retryDetailLabel, children: "\u91CD\u8BD5\u5EF6\u8FDF\uFF1A" }), node.delayMs, " \u6BEB\u79D2"] }), _jsxs("div", { children: [_jsx("span", { className: css.retryDetailLabel, children: "\u5931\u8D25\u539F\u56E0\uFF1A" }), failureMessage(node.failure?.message, node.failure?.code)] })] })] }));
});
//# sourceMappingURL=RetryItem.js.map