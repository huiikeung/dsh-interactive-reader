import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { preparingLabel, readerFlow } from './tool-activity.js';
import { Disclosure, ProcessFragment, RetiringContent, StatusText, useMotionAllowed, usePinnedSelection, useReadingScroll } from './motion.js';
import { StreamMotionContext } from './streaming.js';
import { assistantSegments, boundaryOf, forkAnchorSeq, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection.js';
import { basename, createProducedFileMentions, dirname, getTurnDeliverables } from './deliverables.js';
import { ContextInjectionRow } from './native/ContextInjectionRow.js';
import { TimelineRail } from './TimelineRail.js';
import { mergeTimelineItems } from './timeline.js';
import css from './Reader.module.css';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';
function isNode(node, kind) {
    return node.kind === kind;
}
function cleanErrorMessage(raw) {
    if (!raw)
        return '模型服务暂时无响应或连接中断，请稍后重试。';
    let str = raw.trim();
    if (str.includes('"error"') || str.startsWith('{')) {
        try {
            const idx = str.indexOf('{');
            const parsed = JSON.parse(str.slice(idx));
            const msg = parsed?.error?.message || parsed?.message || parsed?.error;
            if (typeof msg === 'string')
                str = msg;
        }
        catch {
            // keep
        }
    }
    return str;
}
const ProcessNode = memo(function ProcessNode({ useChat, t, nodeKey, open, motion, onRead, returnFocusTo }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    let content = null;
    if (isNode(node, 'context'))
        content = _jsx(ContextInjectionRow, { ...node.data, t: t });
    else if (isNode(node, 'system-prompt'))
        content = _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: "\u7CFB\u7EDF\u63D0\u793A\u8BCD" }), _jsx("pre", { className: css.toolRaw, children: node.data.text })] });
    else if (isNode(node, 'turn-process'))
        content = _jsx(JsonBlock, { label: "\u8F6E\u6B21\u8FC7\u7A0B\u8BB0\u5F55", payload: node.data, truncatedLabel: truncatedJsonLabel });
    else if (isNode(node, 'model-retry'))
        content = _jsx(JsonBlock, { label: "\u6A21\u578B\u91CD\u8BD5\u8BB0\u5F55", payload: node.data.attempts, truncatedLabel: truncatedJsonLabel });
    else if (isNode(node, 'command') || isNode(node, 'manual-compaction'))
        content = _jsx(JsonBlock, { label: "\u547D\u4EE4\u8BB0\u5F55", payload: node.data, truncatedLabel: truncatedJsonLabel });
    return content && _jsx(ProcessFragment, { open: open, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: content });
});
const AssistantNode = memo(function AssistantNode({ useChat, nodeKey, boundary, processOpen = false, pinned = false, motion, onRead, returnFocusTo, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden' || !isNode(node, 'assistant-step'))
        return null;
    const data = node.data;
    const parts = assistantSegments(data.blocks);
    const earlier = isEarlierNarration(data, boundary);
    const hasToolCalls = data.blocks.some(block => block.kind === 'tool-call');
    const isProcessStep = earlier || hasToolCalls || (boundary.latestStep > 0 && data.step < boundary.latestStep);
    const body = data.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call');
    return _jsx(_Fragment, { children: parts.map((part, index) => part.kind === 'reasoning'
            ? _jsx(ProcessFragment, { open: processOpen, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: _jsx(ReasoningCard, { step: data.step, active: processOpen && boundary.status === 'open' && data.step === boundary.latestStep, motion: motion, selected: pinned, onRead: onRead, children: _jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }) }) }, part.start)
            : isProcessStep ? _jsx(ProcessFragment, { open: processOpen, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, children: _jsx("article", { className: css.processCommentary, children: _jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }) }) }, part.start)
                : hasVisibleBody(part.blocks) && _jsx(RetiringContent, { visible: pinned || processOpen || !earlier, children: _jsxs("article", { className: css.answer, "data-reader-answer": true, "data-reader-anchor": true, "data-reader-key": nodeKey, "data-reader-source-start": part.start, "data-answer-status": data.status, "data-answer-phase": "body", children: [_jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }), index === parts.length - 1 && data.status === 'interrupted' && _jsx("span", { className: css.stopped, children: "\u5DF2\u505C\u6B62" }), index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && (_jsx(CopyAnswer, { blocks: body, onFork: (() => {
                                    // The fork anchor must be the durable closing message seq (same as
                                    // the official turn-tail branch). AssistantChatData carries no seq
                                    // of its own; passing it would fork the whole session instead.
                                    const anchor = forkAnchorSeq([data.finalNode, { seq: render.forkSeq }]);
                                    return render.forkAt && anchor !== undefined ? () => render.forkAt(anchor) : undefined;
                                })(), metrics: render.metrics }))] }) }, part.start)) });
});
const CompactionDivider = memo(function CompactionDivider({ data }) {
    const [open, setOpen] = useState(false);
    if (!data)
        return null;
    const hasSummary = typeof data.summary === 'string' && data.summary.trim().length > 0;
    const items = data.shadowedItemCount;
    const tokens = data.shadowedTokenCount;
    let label = '已压缩历史上下文';
    if (items && tokens) {
        const kTokens = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
        label = `已压缩 ${items} 条上下文 · 释放约 ${kTokens} tokens`;
    }
    else if (items) {
        label = `已压缩 ${items} 条上下文`;
    }
    else if (tokens) {
        const kTokens = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
        label = `已压缩上下文 · 释放约 ${kTokens} tokens`;
    }
    return (_jsxs("div", { className: css.compactionRow, "data-reader-compaction": true, children: [_jsx("div", { className: css.compactionLine, children: hasSummary ? (_jsxs("button", { type: "button", className: `${css.compactionPill} ${css.compactionButton}`, onClick: () => setOpen(v => !v), "aria-expanded": open, title: open ? '收起历史记忆摘要' : '展开查看此节点提炼的记忆摘要', children: [_jsxs("svg", { className: css.compactionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("path", { d: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z", strokeWidth: "1.2" }), _jsx("path", { d: "M8 5v3.2l2 1.8", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { children: label }), _jsx("span", { className: css.compactionToggle, children: open ? '收起备忘' : '查看备忘' })] })) : (_jsxs("span", { className: css.compactionPill, children: [_jsxs("svg", { className: css.compactionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("path", { d: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z", strokeWidth: "1.2" }), _jsx("path", { d: "M8 5v3.2l2 1.8", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { children: label })] })) }), open && hasSummary && (_jsxs("div", { className: css.compactionSummaryBox, "data-reader-anchor": true, children: [_jsx("div", { className: css.compactionSummaryHeader, children: "\u524D\u671F\u5BF9\u8BDD\u8981\u70B9\u5907\u5FD8" }), _jsx(MarkdownText, { text: data.summary, labels: markdownLabels })] }))] }));
});
const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    if (isNode(node, 'user') || isNode(node, 'steering')) {
        const blocks = contentBlocks(node.data.content);
        const imageBlocks = blocks.filter(b => b.kind === 'image');
        const otherBlocks = blocks.filter(b => b.kind !== 'image');
        return _jsxs("div", { className: css.userCluster, "data-reader-anchor": true, "data-reader-key": nodeKey, children: [node.kind === 'steering' && _jsx("p", { className: css.meta, children: "\u8865\u5145\u6D88\u606F" }), imageBlocks.length > 0 && _jsx("div", { className: css.userImages, children: _jsx(Blocks, { ...render, blocks: imageBlocks, source: "user" }) }), otherBlocks.length > 0 && _jsx("div", { className: css.user, children: _jsx(Blocks, { ...render, blocks: otherBlocks, source: "user" }) })] });
    }
    if (isNode(node, 'assistant-step'))
        return null;
    if (isNode(node, 'tool-call'))
        return _jsx(ToolMedia, { ...render, block: node.data.root });
    if (isNode(node, 'turn-error'))
        return _jsxs("div", { className: css.error, role: "alert", "data-reader-anchor": true, children: [_jsxs("svg", { className: css.errorIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "8", cy: "8", r: "6.5", strokeWidth: "1.2" }), _jsx("path", { d: "M8 5v3.5M8 11.2h.01", strokeWidth: "1.5", strokeLinecap: "round" })] }), _jsxs("div", { className: css.errorCopy, children: [_jsxs("div", { className: css.errorTitle, children: [_jsx("strong", { children: "\u672C\u8F6E\u8FD0\u884C\u5931\u8D25" }), node.data.code && _jsx("code", { className: css.errorCode, children: node.data.code })] }), _jsx("p", { className: css.errorMessage, children: cleanErrorMessage(node.data.message) })] })] });
    if (isNode(node, 'turn-max-tokens'))
        return _jsx("div", { className: css.notice, children: "\u5DF2\u5230\u8FBE\u8F93\u51FA\u957F\u5EA6\u9650\u5236\uFF0C\u56DE\u7B54\u5C1A\u672A\u5B8C\u6574\u3002" });
    if (isNode(node, 'model-retry'))
        return node.data.current.retryState === 'scheduled'
            ? _jsx("div", { className: css.notice, role: "status", children: "\u6A21\u578B\u8BF7\u6C42\u672A\u6210\u529F\uFF0C\u6B63\u5728\u7B49\u5F85\u91CD\u8BD5\u3002\u8BE6\u60C5\u4FDD\u7559\u5728\u6267\u884C\u8FC7\u7A0B\u4E2D\u3002" }) : null;
    if (isNode(node, 'command')) {
        if (node.data.outcome?.kind === 'error')
            return _jsxs("div", { className: css.error, role: "alert", children: [_jsxs("svg", { className: css.errorIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "8", cy: "8", r: "6.5", strokeWidth: "1.2" }), _jsx("path", { d: "M8 5v3.5M8 11.2h.01", strokeWidth: "1.5", strokeLinecap: "round" })] }), _jsxs("div", { className: css.errorCopy, children: [_jsx("div", { className: css.errorTitle, children: _jsx("strong", { children: "\u547D\u4EE4\u6267\u884C\u672A\u6210\u529F" }) }), _jsx("p", { className: css.errorMessage, children: node.data.outcome.text ?? node.data.name ?? '查看原对话中的命令记录' })] })] });
        return node.data.outcome?.text ? _jsx(MarkdownText, { text: node.data.outcome.text, labels: markdownLabels }) : null;
    }
    if (isNode(node, 'manual-compaction')) {
        if (node.data.command.outcome?.kind === 'error')
            return _jsxs("div", { className: css.error, role: "alert", children: [_jsxs("svg", { className: css.errorIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "8", cy: "8", r: "6.5", strokeWidth: "1.2" }), _jsx("path", { d: "M8 5v3.5M8 11.2h.01", strokeWidth: "1.5", strokeLinecap: "round" })] }), _jsxs("div", { className: css.errorCopy, children: [_jsx("div", { className: css.errorTitle, children: _jsx("strong", { children: "\u4E0A\u4E0B\u6587\u538B\u7F29\u672A\u6210\u529F" }) }), _jsx("p", { className: css.errorMessage, children: node.data.command.outcome.text })] })] });
        return node.data.compaction ? _jsx(CompactionDivider, { data: node.data.compaction }) : null;
    }
    if (isNode(node, 'compaction'))
        return _jsx(CompactionDivider, { data: node.data });
    if (node.kind === 'context' || node.kind === 'turn-tail' || node.kind === 'system-prompt' || node.kind === 'turn-process')
        return null;
    return _jsxs("div", { className: css.unknown, "data-reader-anchor": true, children: [_jsxs("p", { children: ["\u6B64\u8BB0\u5F55\u7C7B\u578B\u6682\u672A\u63A5\u5165\u9605\u8BFB\u9875\uFF1A", node.kind] }), _jsx(JsonBlock, { label: "\u67E5\u770B\u539F\u59CB\u8BB0\u5F55", payload: node.data, truncatedLabel: truncatedJsonLabel })] });
});
function GroupStatus({ group, sessionId, useChat, useSessionStatus, motion }) {
    const pending = useSessionStatus(snapshot => snapshot.get(sessionId)?.pendingInteraction);
    const text = useChat(snapshot => {
        const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn);
        if (turn?.status === 'closed') {
            if (turn.end?.data.reason.kind !== 'completed')
                return '执行过程';
            const elapsed = turn.start && turn.end ? Math.max(0, Math.round((turn.end.time - turn.start.time) / 1000)) : null;
            return elapsed === null ? '执行过程' : elapsed < 60 ? `用时 ${elapsed} 秒` : `用时 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`;
        }
        if (turn?.status !== 'open')
            return '执行过程';
        if (pending !== undefined)
            return '等待你的操作';
        const current = turn.steps.at(-1)?.data.get('assistant-step');
        const last = current?.blocks.at(-1);
        if (current?.status === 'running' && last?.kind === 'tool-call')
            return preparingLabel(last.name);
        for (let index = group.keys.length - 1; index >= 0; index--) {
            const node = snapshot.nodes.get(group.keys[index]);
            if (!node)
                continue;
            if (isNode(node, 'tool-call') && !('kind' in node.data.root))
                return '正在使用工具';
            if (isNode(node, 'assistant-step') && node.data.status === 'running') {
                const last = node.data.blocks.at(-1);
                return last?.kind === 'reasoning' ? '正在思考' : last?.kind === 'text' ? '正在输出' : '正在准备回复';
            }
        }
        return '正在处理';
    });
    const busy = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open' && pending === undefined);
    return _jsx(StatusText, { text: text, motion: motion, shimmer: busy });
}
const DeliverableChip = memo(function DeliverableChip({ path, openFile, revealFile }) {
    const [status, setStatus] = useState('idle');
    const timer = useRef();
    const flash = (next) => {
        setStatus(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus('idle'), 1600);
    };
    const onOpen = (event) => {
        event.stopPropagation();
        try {
            openFile?.(path);
            flash('opened');
        }
        catch {
            // fallback
        }
    };
    const onReveal = (event) => {
        event.stopPropagation();
        try {
            if (revealFile) {
                revealFile(path);
            }
            else {
                openFile?.(dirname(path));
            }
            flash('revealed');
        }
        catch {
            // fallback
        }
    };
    const onCopy = (event) => {
        event.stopPropagation();
        try {
            void navigator.clipboard?.writeText(path);
            flash('copied');
        }
        catch {
            // fallback
        }
    };
    const name = basename(path);
    const folder = dirname(path);
    return (_jsxs("div", { className: css.deliverableChip, "data-status": status, title: path, children: [_jsxs("button", { type: "button", className: css.chipMain, onClick: onOpen, onDoubleClick: onOpen, "aria-label": `直接在编辑器中打开 ${path}`, children: [status === 'opened' ? (_jsx("svg", { className: css.statusIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: _jsx("path", { d: "M3.5 8.5l3 3 6-7", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })) : (_jsxs("svg", { className: css.deliverableIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("path", { d: "M4 2.5h5l3 3V13.5H4V2.5z", strokeWidth: "1.2", strokeLinejoin: "round" }), _jsx("path", { d: "M9 2.5v3h3", strokeWidth: "1.2", strokeLinejoin: "round" })] })), _jsx("span", { className: css.deliverableName, children: status === 'opened' ? '已在外部打开' : name })] }), _jsxs("div", { className: css.chipActions, "aria-label": "\u6587\u4EF6\u64CD\u4F5C", children: [_jsx("button", { type: "button", className: css.chipActionBtn, title: `在访达中定位所在目录 (${folder})`, "aria-label": "\u5728\u8BBF\u8FBE\u4E2D\u663E\u793A\u6240\u5728\u76EE\u5F55", onClick: onReveal, children: status === 'revealed' ? (_jsx("svg", { className: css.actionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: _jsx("path", { d: "M3.5 8.5l3 3 6-7", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })) : (_jsx("svg", { className: css.actionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: _jsx("path", { d: "M2 4.5h4l1.5 2H14v6.5H2V4.5z", strokeWidth: "1.2", strokeLinejoin: "round" }) })) }), _jsx("button", { type: "button", className: css.chipActionBtn, title: "\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84", "aria-label": "\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84", onClick: onCopy, children: status === 'copied' ? (_jsx("svg", { className: css.actionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: _jsx("path", { d: "M3.5 8.5l3 3 6-7", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })) : (_jsxs("svg", { className: css.actionIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: [_jsx("rect", { x: "5.5", y: "5.5", width: "8", height: "8", rx: "1.5", strokeWidth: "1.2" }), _jsx("path", { d: "M4 10.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1", strokeWidth: "1.2", strokeLinecap: "round" })] })) })] })] }));
});
function DeliverablesRow({ deliverables, openFile, revealFile }) {
    const [folderStatus, setFolderStatus] = useState('idle');
    const onOpenWorkspace = () => {
        try {
            openFile?.('.');
            setFolderStatus('opened');
            setTimeout(() => setFolderStatus('idle'), 1600);
        }
        catch {
            // ignore
        }
    };
    return (_jsxs("div", { className: css.deliverablesRoot, "data-reader-deliverables": true, children: [_jsx("span", { className: css.deliverablesLabel, children: "\u4EA7\u7269" }), _jsx("div", { className: css.deliverablesLane, children: _jsxs("div", { className: css.deliverablesRow, children: [deliverables.slice(0, 8).map(path => (_jsx(DeliverableChip, { path: path, openFile: openFile, revealFile: revealFile }, path))), deliverables.length > 8 && (_jsxs("span", { className: css.deliverablesMore, children: ["+ ", deliverables.length - 8, " \u4E2A\u6587\u4EF6"] })), deliverables.length > 1 && (_jsxs("button", { type: "button", className: css.deliverablesShowFolder, "data-status": folderStatus, onClick: onOpenWorkspace, title: "\u5728\u8BBF\u8FBE\u4E2D\u6253\u5F00\u6574\u4E2A\u5DE5\u4F5C\u533A\u76EE\u5F55", children: [folderStatus === 'opened' && (_jsx("svg", { className: css.statusIcon, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", children: _jsx("path", { d: "M3.5 8.5l3 3 6-7", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })), _jsx("span", { children: folderStatus === 'opened' ? '已打开访达' : '在文件夹中显示' })] }))] }) })] }));
}
const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }) {
    const nodes = props.useChat(snapshot => snapshot.nodes);
    const turn = props.useChat(snapshot => group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn));
    const boundary = useMemo(() => boundaryOf(turn), [turn]);
    const choiceKey = processChoiceKey(group.key, boundary);
    const expansionChoice = props.useStore(state => state.expanded[choiceKey]);
    const flowId = useId();
    const processButton = useRef(null);
    const setExpanded = useCallback((value) => props.actions.setExpanded(choiceKey, value), [props.actions, choiceKey]);
    const pinProcess = useCallback(() => setExpanded(true), [setExpanded]);
    const firstKind = props.useChat(snapshot => snapshot.nodes.get(group.keys[0])?.kind);
    const startsWithUser = firstKind === 'user';
    const mainKeys = startsWithUser ? group.keys.slice(1) : group.keys;
    const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => nodes.get(key)), [nodes, group, mainKeys, turn]);
    const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(nodes.get(item.nodeKey), boundary));
    // Only a real, still-active text selection delays folding. Merely clicking,
    // focusing or scrolling the live card does not create a permanent override.
    const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
    const expanded = holdingSelection || processExpanded(expansionChoice, boundary);
    const deliverables = useMemo(() => getTurnDeliverables(turn, flow), [turn, flow]);
    const fileMentions = useMemo(() => deliverables.length > 0 && props.openFile ? createProducedFileMentions(deliverables, props.openFile) : undefined, [deliverables, props.openFile]);
    const tailData = useMemo(() => {
        for (const key of group.keys) {
            const n = nodes.get(key);
            if (n && isNode(n, 'turn-tail'))
                return n.data;
        }
        return undefined;
    }, [group.keys, nodes]);
    const runMs = turn?.start && turn?.end ? Math.max(0, turn.end.time - turn.start.time) : undefined;
    const metrics = useMemo(() => ({
        usage: tailData?.tokenUsage,
        runMs,
        tokensPerSecond: tailData?.tokensPerSecond,
        ttftMs: tailData?.ttftMs,
    }), [tailData, runMs]);
    const forkSeq = forkAnchorSeq([tailData?.closing?.finalNode]);
    const shared = {
        useChat: props.useChat,
        renderSlotChain: props.renderSlotChain,
        loadImage: props.loadImage,
        fillComposer: props.fillComposer,
        openFile: props.openFile,
        revealFile: props.revealFile,
        forkAt: props.forkAt,
        forkSeq,
        fileMentions,
        metrics,
    };
    const terminal = terminalLabel(boundary.reason);
    const hasTurnError = flow.some(item => item.kind === 'node' && nodes.get(item.nodeKey)?.kind === 'turn-error');
    const showTerminalNotice = terminal && !hasTurnError && boundary.reason !== 'interrupted' && boundary.reason !== 'aborted';
    return _jsxs("section", { className: css.turn, "data-reader-turn": group.turn ?? 'unresolved', "data-reader-turn-state": boundary.status, "data-reader-turn-result": boundary.reason ?? undefined, children: [startsWithUser && _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: group.keys[0] }) }), hasProcess && _jsx(Disclosure, { open: expanded, onChange: setExpanded, controls: flowId, buttonRef: processButton, label: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionStatus: props.useSessionStatus, motion: motion }), status: turn?.steps.length ? `${turn.steps.length} 个步骤` : undefined }), !hasProcess && boundary.status === 'open' && _jsx("div", { className: css.disclosure, "data-reader-status-only": true, children: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionStatus: props.useSessionStatus, motion: motion }) }), _jsx("div", { id: flowId, className: css.mainFlow, "data-reader-flow": true, children: flow.map(item => item.kind === 'node' ? _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessNode, { useChat: props.useChat, t: props.t, nodeKey: item.nodeKey, open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(AssistantNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded }) })] }, item.key) : _jsx(Fragment, { children: _jsx(BlockBoundary, { children: _jsxs(ProcessFragment, { open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton, nodeKey: item.key, framed: true, children: [_jsx(ToolActivity, { ...shared, entry: item, motion: motion, turnClosed: boundary.status === 'closed', onRead: pinProcess }), item.block && _jsx(ToolMedia, { ...shared, block: item.block })] }) }) }, item.key)) }), deliverables.length > 0 && _jsx(DeliverablesRow, { deliverables: deliverables, openFile: props.openFile, revealFile: props.revealFile }), showTerminalNotice && _jsx("div", { className: css.notice, "data-reader-terminal": true, children: terminal })] });
});
export function Reader(props) {
    const root = useRef(null);
    const activatedAt = useRef(Date.now());
    const order = props.useChat(snapshot => snapshot.order);
    const nodes = props.useChat(snapshot => snapshot.nodes);
    const timeline = props.useChat(snapshot => snapshot.timeline);
    const pending = props.useSessionStatus(snapshot => snapshot.get(props.sessionId)?.pendingInteraction);
    const openError = props.useSession(snapshot => snapshot.openError);
    const loading = props.useSession(snapshot => snapshot.openState === 'loading');
    const hasMore = props.useSession(snapshot => snapshot.hasMore);
    const loadingOlder = props.useSession(snapshot => snapshot.loadingOlder);
    const pendingSubmissions = props.useSession(snapshot => snapshot.pendingSubmissions);
    const motionPreference = props.useStore(state => state.motion);
    const motion = useMotionAllowed(motionPreference);
    const streamMotion = useMemo(() => ({ enabled: motion, activatedAt: activatedAt.current }), [motion]);
    const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes, timeline]);
    const scroll = useReadingScroll(root, motion);
    const pinnedKeys = usePinnedSelection(root);
    const selectedProcessKeys = usePinnedSelection(root, '[data-reader-process]');
    const [historyError, setHistoryError] = useState(false);
    // 1. Navigation items from Chat snapshot
    const turnNavigationItems = props.useChat(snapshot => snapshot.navigation?.items ? snapshot.navigation.items() : undefined);
    // 2. Whole-log turn outline projection
    const turnOutline = props.useProjection?.('turnOutline');
    // 3. Track turns with deliverables
    const turnsWithDeliverables = useMemo(() => {
        const set = new Set();
        for (const [turnNum, loc] of timeline.turns) {
            const deliv = loc.data?.get('deliverables');
            if (Array.isArray(deliv?.produced) && deliv.produced.length > 0) {
                set.add(turnNum);
            }
        }
        return set;
    }, [timeline]);
    // 4. Merged timeline items for the rail
    const timelineItems = useMemo(() => mergeTimelineItems(turnNavigationItems, turnOutline, turnsWithDeliverables), [turnNavigationItems, turnOutline, turnsWithDeliverables]);
    // 5. Active & busy turn tracking
    const [activeTurn, setActiveTurn] = useState(null);
    const [busyTurn, setBusyTurn] = useState(null);
    // Scroll spy to update activeTurn
    useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const scroller = el.closest('[data-conversation-scroll]') ?? el;
        let ticking = false;
        const updateActive = () => {
            if (ticking)
                return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                const line = (scroller instanceof HTMLElement ? scroller.clientHeight : window.innerHeight) * 0.35;
                const turnRows = el.querySelectorAll('[data-reader-turn]:not([data-reader-turn="unresolved"])');
                let current = null;
                for (const row of turnRows) {
                    const rect = row.getBoundingClientRect();
                    if (rect.top <= line) {
                        const num = Number(row.dataset.readerTurn);
                        if (Number.isSafeInteger(num))
                            current = num;
                    }
                    else {
                        break;
                    }
                }
                if (current !== null) {
                    setActiveTurn(current);
                }
                else if (turnRows.length > 0) {
                    const first = Number(turnRows[0].dataset.readerTurn);
                    if (Number.isSafeInteger(first))
                        setActiveTurn(first);
                }
            });
        };
        scroller.addEventListener('scroll', updateActive, { passive: true });
        updateActive();
        return () => scroller.removeEventListener('scroll', updateActive);
    }, [groups]);
    // Navigation handler (supports loaded jump & unloaded loadThrough)
    const onNavigateTurn = useCallback(async (item) => {
        const el = root.current;
        if (!el)
            return;
        if (item.anchor.kind === 'loaded') {
            const targetRow = el.querySelector(`[data-reader-turn="${item.turn}"]`);
            if (targetRow) {
                targetRow.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
                setActiveTurn(item.turn);
            }
            return;
        }
        setBusyTurn(item.turn);
        try {
            if (props.loadThrough) {
                await props.loadThrough(item.anchor.seq);
            }
            else {
                await props.loadOlder();
            }
            setTimeout(() => {
                const targetRow = el.querySelector(`[data-reader-turn="${item.turn}"]`);
                if (targetRow) {
                    targetRow.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
                    setActiveTurn(item.turn);
                }
            }, 50);
        }
        finally {
            setBusyTurn(null);
        }
    }, [props.loadThrough, props.loadOlder, motion]);
    const lastKey = order.at(-1);
    const lastNode = lastKey ? nodes.get(lastKey) : undefined;
    const lastSubmissionId = pendingSubmissions?.length ? pendingSubmissions[pendingSubmissions.length - 1].requestId : null;
    const lastOrderKeyRef = useRef(lastKey);
    const lastSubmissionRef = useRef(lastSubmissionId);
    useLayoutEffect(() => {
        const appendedUser = lastKey !== lastOrderKeyRef.current && (lastNode?.kind === 'user' || lastNode?.kind === 'steering');
        const appendedSubmission = lastSubmissionId !== null && lastSubmissionId !== lastSubmissionRef.current;
        lastOrderKeyRef.current = lastKey;
        lastSubmissionRef.current = lastSubmissionId;
        if (appendedUser || appendedSubmission) {
            scroll.jump();
        }
    }, [lastKey, lastNode?.kind, lastSubmissionId, scroll]);
    const visibleSubmissions = useMemo(() => {
        if (!pendingSubmissions || pendingSubmissions.length === 0)
            return [];
        return pendingSubmissions.filter(sub => sub.placement !== 'queued');
    }, [pendingSubmissions]);
    return _jsx(StreamMotionContext.Provider, { value: streamMotion, children: _jsxs("div", { ref: root, className: css.root, "data-dsh-better-display": "0.2.1", "data-motion": motion ? 'on' : 'off', children: [_jsx(TimelineRail, { items: timelineItems, activeTurn: activeTurn, busyTurn: busyTurn, onNavigate: onNavigateTurn }), _jsxs("div", { className: css.column, children: [_jsxs("div", { className: css.toolbar, "data-ud-check": "reader-toolbar", children: [_jsx("span", { title: "\u57FA\u4E8E\u771F\u5B9E\u6D88\u606F\u7C7B\u578B\u548C\u8F6E\u6B21\u8FB9\u754C\u6574\u7406\u3002\u5F53\u524D\u534F\u8BAE\u6CA1\u6709\u72EC\u7ACB\u7684\u6B63\u6587\u9636\u6BB5\u6807\u8BB0\uFF0C\u65E0\u6CD5\u786E\u8BA4\u7684\u5185\u5BB9\u4F1A\u7EE7\u7EED\u4FDD\u7559\u3002", children: "\u9605\u8BFB \u00B7 \u539F\u59CB\u8BB0\u5F55\u5B8C\u6574\u4FDD\u7559" }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": motionPreference, onClick: () => props.actions.setMotion(!motionPreference), title: "\u65B0\u5230\u6587\u5B57\u67D4\u548C\u663E\u73B0\uFF0C\u8FC7\u7A0B\u5E73\u6ED1\u5C55\u5F00\uFF1B\u5173\u95ED\u540E\u7ACB\u5373\u5B8C\u6574\u663E\u793A\uFF0C\u81EA\u52A8\u9075\u5FAA\u7CFB\u7EDF\u51CF\u5C11\u52A8\u6001\u6548\u679C\u8BBE\u7F6E\u3002", children: motionPreference && !motion ? '动效 · 跟随系统关闭' : `动效${motionPreference ? '开' : '关'}` })] }), hasMore && _jsx("button", { type: "button", className: css.historyButton, disabled: loadingOlder, onClick: async () => {
                                setHistoryError(false);
                                try {
                                    await props.loadOlder();
                                }
                                catch {
                                    setHistoryError(true);
                                }
                            }, children: loadingOlder ? '正在加载更早记录' : '加载更早记录' }), historyError && _jsx("div", { className: css.notice, children: "\u5386\u53F2\u8BB0\u5F55\u52A0\u8F7D\u5931\u8D25\uFF0C\u53EF\u518D\u6B21\u5C1D\u8BD5\uFF1B\u73B0\u6709\u5185\u5BB9\u672A\u6539\u53D8\u3002" }), openError && _jsxs("div", { className: css.error, role: "alert", children: ["\u4F1A\u8BDD\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\uFF1A", openError.message] }), loading && groups.length === 0 && _jsx("p", { className: css.empty, role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u2026" }), groups.map(group => _jsx(TurnGroup, { ...props, group: group, motion: motion, pinnedKeys: pinnedKeys, selectedProcessKeys: selectedProcessKeys }, group.key)), visibleSubmissions.map(submission => {
                            // DSH 0.1.6 replaced `images` with an ordered `attachments` union of
                            // image previews and durable file references; only the image branch has
                            // a preview to render before admission.
                            const images = submission.attachments.flatMap(attachment => attachment.type === 'image' ? [attachment.value] : []);
                            return _jsxs("div", { className: css.userCluster, "data-reader-pending-submission": true, children: [images.length > 0 && (_jsx("div", { className: css.userImages, children: images.map((img, idx) => (_jsx("figure", { className: css.imageFigure, children: _jsx("div", { className: css.imageFrame, style: { aspectRatio: `${img.width || 4} / ${img.height || 3}` }, children: _jsx("img", { src: img.previewUrl, alt: img.name ?? '发送的图片', className: css.pendingImage }) }) }, idx))) })), submission.text ? (_jsx("div", { className: css.user, children: _jsx("div", { className: css.blocks, children: submission.text }) })) : null] }, submission.requestId);
                        }), pending !== undefined && _jsxs("div", { className: css.attention, role: "alert", "data-reader-attention": true, children: [_jsx("strong", { children: pending.kind === 'question' ? '需要你回答一个问题' : '需要你的确认' }), _jsx("span", { children: "\u8BF7\u5728\u4E0B\u65B9\u539F\u751F\u64CD\u4F5C\u533A\u5904\u7406\u3002\u6B64\u63D0\u793A\u4E0D\u4F1A\u6536\u8FDB\u6267\u884C\u8FC7\u7A0B\u3002" })] }), scroll.detached && _jsx("div", { className: css.jumpDock, children: _jsx("button", { type: "button", className: css.jump, onClick: scroll.jump, children: "\u2193 \u56DE\u5230\u6700\u65B0" }) })] })] }) });
}
//# sourceMappingURL=Reader.js.map