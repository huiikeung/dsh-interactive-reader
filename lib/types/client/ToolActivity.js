import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DisclosureRow, JsonTree, ReadBlock, TerminalBlock, IconApiOutline14, IconBrowseOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16, IconSparkle16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { Blocks, contentBlocks } from './Blocks.js';
import { ProcessFragment } from './motion.js';
import { activityPhase, activitySummary, executionFacts, toolIdentity } from './tool-activity.js';
import { classifyTool, toolRowModel, VARIANT_TITLES } from './native/tool-call-model.js';
import { jsonTreeLabels, readBlockLabels, terminalBlockLabels } from './native-labels.js';
import css from './Reader.module.css';
const LABEL = { preparing: '输入生成中', running: '执行中', returned: '已返回', succeeded: '已完成', failed: '失败', interrupted: '已中断' };
const ICONS = { write: IconEditOutline16, read: IconBrowseOutline16, terminal: IconApiOutline14, search: IconSearchOutline16, web: IconSearchOutline16, other: IconSparkle16 };
const number = new Intl.NumberFormat('zh-CN');
const language = (path) => path?.split('.').at(-1);
const duration = (ms) => ms < 1000 ? `${Math.round(ms)} 毫秒` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} 秒`;
function generatedInput(content, target, preparing) {
    const lines = content.split('\n').map((text, index) => ({ number: index + 1, text }));
    const visible = preparing ? lines.slice(-12) : lines.slice(0, 1600);
    return _jsxs("div", { "data-reader-tool-file": true, children: [_jsxs("p", { className: css.toolDetailNote, children: [preparing ? '正在生成的输入 · 尚未执行 · 末尾 12 行' : '工具输入中的文件内容', !preparing && lines.length > visible.length ? ' · 预览前 1,600 行，完整内容在原始数据中' : ''] }), _jsx(ReadBlock, { label: target ?? '文件内容', lang: language(target), lines: visible, totalLines: lines.length, maxLines: 16, labels: readBlockLabels })] });
}
function InputView({ model, preparing }) {
    if (model.content)
        return generatedInput(model.content, model.target, preparing);
    if (model.command)
        return _jsxs("div", { "data-reader-tool-terminal": true, children: [_jsx("p", { className: css.toolDetailNote, children: preparing ? '正在生成命令 · 尚未执行' : '提交的命令' }), _jsx(TerminalBlock, { command: model.command, cwd: model.cwd, labels: terminalBlockLabels })] });
    return _jsx(JsonTree, { data: model.args, label: preparing ? '已收到的输入字段' : '工具输入', labels: jsonTreeLabels });
}
function ResultView({ entry, model, phase, ...render }) {
    const block = entry.block;
    if (!block || !('kind' in block))
        return _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: phase === 'interrupted' ? '已中断，没有工具结果。已生成的输入仍可查看。' : phase === 'preparing' ? '模型正在生成工具输入，工具还未开始执行。' : '工具已开始执行，正在等待结果。' }), _jsx(InputView, { model: model, preparing: phase === 'preparing' })] });
    const text = block.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
    if (model.category === 'terminal') {
        const facts = executionFacts(block);
        return _jsx("div", { "data-reader-tool-terminal": true, children: _jsx(TerminalBlock, { command: model.command ?? model.name, cwd: model.cwd, output: text, exitCode: facts.exitCode, signal: facts.signal, maxLines: 18, labels: terminalBlockLabels }) });
    }
    // Alpha.1 removed the host-computed resultView/callView presentation. Keep
    // submitted file content visible while deriving all result truth from the
    // durable content/meta fields below.
    if (model.category === 'write' && model.content && !block.isError)
        return _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: "\u6587\u4EF6\u5DE5\u5177\u5DF2\u8FD4\u56DE\u3002\u4EE5\u4E0B\u4E3A\u63D0\u4EA4\u7684\u5185\u5BB9\uFF1B\u5B8C\u6574\u8FD4\u56DE\u8BB0\u5F55\u53EF\u5728\u300C\u539F\u59CB\u6570\u636E\u300D\u67E5\u770B\u3002" }), generatedInput(model.content, model.target, false)] });
    const content = block.content;
    if (content.some(item => item.type === 'text'))
        return _jsx("div", { className: css.toolDocument, children: _jsx(Blocks, { ...render, blocks: contentBlocks(content).filter(item => item.kind === 'text'), source: "tool" }) });
    if (content.length)
        return _jsx("p", { className: css.toolDetailNote, children: "\u56FE\u7247\u6216\u6269\u5C55\u5185\u5BB9\u5DF2\u5728\u5BF9\u8BDD\u4E2D\u5355\u72EC\u5C55\u793A\u3002" });
    return _jsx("p", { className: css.toolDetailNote, children: "\u5DE5\u5177\u6CA1\u6709\u8FD4\u56DE\u53EF\u5C55\u793A\u7684\u5185\u5BB9\u3002" });
}
/** One occurrence, keyed by call id all the way from generation to result. */
export const ToolActivity = memo(function ToolActivityView({ entry, motion, turnClosed, onRead, depth = 0, ...render }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('result');
    const control = useRef(null);
    const panel = useRef(null);
    const [selected, setSelected] = useState(false);
    const detailId = useId();
    const tabRefs = useRef([]);
    const model = useMemo(() => activitySummary(entry), [entry.block, entry.draft]);
    const phase = activityPhase(entry, turnClosed);
    const heldPreview = useRef({ entry, model, phase });
    if (!selected)
        heldPreview.current = { entry, model, phase };
    const preview = heldPreview.current;
    useEffect(() => {
        const track = () => {
            const selection = document.getSelection();
            setSelected(!!selection && !selection.isCollapsed && !!selection.anchorNode && !!panel.current?.contains(selection.anchorNode));
        };
        document.addEventListener('selectionchange', track);
        return () => document.removeEventListener('selectionchange', track);
    }, []);
    const facts = executionFacts(entry.block);
    const Icon = model.name === 'skill' ? IconSkillOutline16 : ICONS[model.category];
    const block = entry.block;
    const native = block ? toolRowModel(model.name, block) : null;
    const skillName = typeof model.args?.name === 'string' ? model.args.name.split('\n')[0] : model.raw.split('\n')[0];
    const rowTitle = model.name === 'skill' ? 'Skill' : native?.title ?? VARIANT_TITLES[classifyTool(model.name)];
    const rowSummary = model.name === 'skill' ? skillName : native?.errorSummary ?? native?.summary
        ?? (classifyTool(model.name) === 'others' ? `${model.name} · ${model.target ?? model.title}` : model.target ?? model.title);
    const showState = phase === 'preparing' || phase === 'running' || phase === 'failed' || phase === 'interrupted';
    const elapsed = block && 'kind' in block && block.callTime != null ? Math.max(0, block.time - block.callTime) : null;
    const rawResult = useMemo(() => {
        const value = preview.entry.block;
        return value && 'kind' in value ? JSON.stringify({ content: value.content, isError: value.isError, meta: value.meta }, null, 2) : '';
    }, [preview.entry.block]);
    const tabs = [['result', phase === 'preparing' ? '生成预览' : '结果'], ['input', '输入'], ['raw', '原始数据']];
    const activate = (index) => { const item = tabs[(index + tabs.length) % tabs.length]; setTab(item[0]); tabRefs.current[(index + tabs.length) % tabs.length]?.focus(); };
    if (depth > 6)
        return _jsx("p", { className: css.meta, children: "\u66F4\u6DF1\u7684\u5D4C\u5957\u8C03\u7528\u53EF\u5728\u539F\u5BF9\u8BDD\u67E5\u770B\u3002" });
    return _jsxs("div", { ref: element => { control.current = element?.querySelector('[data-disclosure-row]') ?? null; }, className: css.toolActivity, "data-reader-tool-call": entry.callId, "data-tool-phase": phase, "data-tool-args-length": model.raw.length, "data-tool-category": model.category, "data-expanded": open, "data-ud-check": "reader-tool-activity", children: [_jsx(DisclosureRow, { icon: _jsx(Icon, { size: 14 }), title: rowTitle, open: open, expandable: true, expandOnRowClick: true, keepContentWhenOpen: true, onToggle: () => { onRead(); setOpen(value => !value); }, rowClassName: css.nativeToolRow, collapsedContent: _jsxs(_Fragment, { children: [_jsx("span", { className: css.rowSeparator, "aria-hidden": true }), _jsx("span", { className: css.nativeToolSummary, title: rowSummary, "data-reader-tool-summary": true, children: rowSummary }), showState && _jsx("span", { className: css.toolState, "data-phase": phase, children: LABEL[phase] })] }) }), _jsx(ProcessFragment, { open: open, motion: motion, onRead: onRead, returnFocusTo: control, nodeKey: `${entry.key}:detail`, framed: true, children: _jsxs("div", { id: detailId, className: css.toolDetails, children: [_jsxs("div", { className: css.toolLedger, "aria-live": "off", children: [_jsxs("span", { children: ["\u5DE5\u5177 \u00B7 ", _jsx("span", { className: css.toolEngine, children: model.name })] }), _jsx("span", { "data-reader-tool-progress": true, children: phase === 'preparing' ? `已接收 ${number.format(model.raw.length)} 字符输入` : phase === 'running' ? '已提交 · 等待工具返回' : phase === 'interrupted' ? '已停止 · 输入记录保留' : elapsed !== null ? `执行 ${duration(elapsed)}` : '结果已记录' }), facts.exitCode !== undefined && _jsxs("span", { children: ["\u9000\u51FA\u7801 ", facts.exitCode] }), facts.signal && _jsxs("span", { children: ["\u4FE1\u53F7 ", facts.signal] })] }), _jsx("div", { className: css.toolTabs, role: "tablist", "aria-label": `${model.title}的执行数据`, onKeyDown: event => {
                                const index = tabs.findIndex(item => item[0] === tab);
                                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                                    event.preventDefault();
                                    activate(index + (event.key === 'ArrowRight' ? 1 : -1));
                                }
                                else if (event.key === 'Home' || event.key === 'End') {
                                    event.preventDefault();
                                    activate(event.key === 'Home' ? 0 : tabs.length - 1);
                                }
                            }, children: tabs.map(([id, title], index) => _jsx("button", { ref: element => { tabRefs.current[index] = element; }, type: "button", role: "tab", id: `${detailId}-${id}`, "aria-selected": tab === id, "aria-controls": `${detailId}-panel`, tabIndex: tab === id ? 0 : -1, onClick: () => setTab(id), children: title }, id)) }), _jsxs("div", { ref: panel, id: `${detailId}-panel`, className: css.toolPanel, role: "tabpanel", "aria-labelledby": `${detailId}-${tab}`, tabIndex: 0, children: [selected && _jsx("p", { className: css.toolDetailNote, children: "\u4E3A\u4FDD\u7559\u9009\u533A\uFF0C\u9884\u89C8\u6682\u505C\u66F4\u65B0\uFF1B\u5F53\u524D\u72B6\u6001\u89C1\u5361\u7247\u6807\u9898\u3002" }), tab === 'result' && _jsx(ResultView, { ...render, ...preview }), tab === 'input' && _jsxs(_Fragment, { children: [_jsx(InputView, { model: preview.model, preparing: preview.phase === 'preparing' }), _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: "\u5168\u90E8\u8F93\u5165\u5B57\u6BB5" }), _jsx(JsonTree, { data: preview.model.args, label: "\u8F93\u5165\u5B57\u6BB5", labels: jsonTreeLabels })] })] }), tab === 'raw' && _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: "\u5B8C\u6574\u8BB0\u5F55 \u00B7 \u53EA\u8BFB \u00B7 \u4E0D\u6267\u884C\u5176\u4E2D\u7684\u4EE3\u7801" }), _jsx("h4", { className: css.toolRawLabel, children: "\u5DE5\u5177\u8F93\u5165" }), _jsx("pre", { className: css.toolRaw, children: preview.model.raw || '输入尚未到达' }), rawResult && _jsxs(_Fragment, { children: [_jsx("h4", { className: css.toolRawLabel, children: "\u5DE5\u5177\u7ED3\u679C" }), _jsx("pre", { className: css.toolRaw, children: rawResult })] })] })] })] }) }), !!block?.subCalls.length && _jsx("div", { className: css.toolChildren, "aria-label": "\u5B50\u8C03\u7528", children: block.subCalls.map((child, index) => _jsx(ToolActivity, { ...render, entry: { kind: 'tool', key: `reader-tool:${child.callId}`, callId: child.callId, step: entry.step, order: index, block: child }, motion: motion, turnClosed: turnClosed, onRead: onRead, depth: depth + 1 }, child.callId)) })] });
}, (previous, next) => previous.entry.callId === next.entry.callId && previous.entry.block === next.entry.block
    && previous.entry.draft === next.entry.draft && previous.entry.step === next.entry.step
    && previous.motion === next.motion && previous.turnClosed === next.turnClosed && previous.depth === next.depth
    && previous.onRead === next.onRead && previous.renderSlotChain === next.renderSlotChain && previous.loadImage === next.loadImage);
/** Media and failures never disappear inside a folded execution record. */
export function ToolMedia({ block, depth = 0, ...render }) {
    if (depth > 6)
        return null;
    const settled = 'kind' in block;
    const failed = activityPhase({ block }) === 'failed';
    const visible = settled ? contentBlocks(block.content).filter(item => block.isError || item.kind === 'image' || item.kind === 'other') : [];
    return _jsxs(_Fragment, { children: [failed && _jsxs("div", { className: css.error, role: "alert", children: [toolIdentity({ block }).name, " \u6267\u884C\u672A\u6210\u529F", executionFacts(block).exitCode !== undefined ? ` · 退出码 ${executionFacts(block).exitCode}` : '', "\uFF0C\u8BE6\u60C5\u4FDD\u7559\u5728\u6267\u884C\u8BB0\u5F55\u4E2D\u3002"] }), visible.length > 0 && _jsx(Blocks, { ...render, blocks: visible, source: "tool" }), block.subCalls.map(child => _jsx(ToolMedia, { ...render, block: child, depth: depth + 1 }, child.callId))] });
}
//# sourceMappingURL=ToolActivity.js.map