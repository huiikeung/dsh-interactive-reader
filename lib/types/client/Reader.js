import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, memo, useCallback, useId, useMemo, useRef, useState } from 'react';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { preparingLabel, readerFlow } from './tool-activity.js';
import { Disclosure, ProcessFragment, RetiringContent, StatusText, useMotionAllowed, usePinnedSelection, useReadingScroll } from './motion.js';
import { StreamMotionContext } from './streaming.js';
import { assistantSegments, boundaryOf, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection.js';
import { RetryCard } from './RetryCard.js';
import { ContextInjectionRow } from './native/ContextInjectionRow.js';
import { markdownLabels, truncatedJsonLabel } from './native-labels.js';
import css from './Reader.module.css';
function isNode(node, kind) {
    return node.kind === kind;
}
const ProcessNode = memo(function ProcessNode({ useChat, t, nodeKey, open, motion, onRead, returnFocusTo }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    let content = null;
    if (isNode(node, 'context'))
        content = _jsx(ContextInjectionRow, { ...node.data, t: t });
    else if (isNode(node, 'model-retry'))
        content = _jsx(RetryCard, { attempts: node.data.attempts });
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
    const body = data.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call');
    return _jsx(_Fragment, { children: parts.map((part, index) => part.kind === 'reasoning'
            ? _jsx(ProcessFragment, { open: processOpen, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: _jsx(ReasoningCard, { step: data.step, active: processOpen && boundary.status === 'open' && data.step === boundary.latestStep, motion: motion, selected: pinned, onRead: onRead, children: _jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }) }) }, part.start)
            : hasVisibleBody(part.blocks) && _jsx(RetiringContent, { visible: pinned || processOpen || !earlier, children: _jsxs("article", { className: css.answer, "data-reader-answer": true, "data-reader-anchor": true, "data-reader-key": nodeKey, "data-reader-source-start": part.start, "data-answer-status": data.status, "data-answer-phase": earlier ? 'process' : 'body', children: [_jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }), index === parts.length - 1 && data.status === 'interrupted' && _jsx("span", { className: css.stopped, children: "\u5DF2\u505C\u6B62" }), index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && _jsx(CopyAnswer, { blocks: body })] }) }, part.start)) });
});
const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    if (isNode(node, 'user') || isNode(node, 'steering'))
        return _jsxs("div", { className: css.user, "data-reader-anchor": true, "data-reader-key": nodeKey, children: [node.kind === 'steering' && _jsx("p", { className: css.meta, children: "\u8865\u5145\u6D88\u606F" }), _jsx(Blocks, { ...render, blocks: contentBlocks(node.data.content), source: "user" })] });
    if (isNode(node, 'assistant-step'))
        return null;
    if (isNode(node, 'tool-call'))
        return _jsx(ToolMedia, { ...render, block: node.data.root });
    if (isNode(node, 'turn-error'))
        return _jsxs("div", { className: css.error, role: "alert", "data-reader-anchor": true, children: [_jsx("strong", { children: "\u672C\u8F6E\u51FA\u73B0\u9519\u8BEF" }), _jsx("p", { children: node.data.message }), node.data.code && _jsx("code", { children: node.data.code })] });
    if (isNode(node, 'turn-max-tokens'))
        return _jsx("div", { className: css.notice, children: "\u5DF2\u5230\u8FBE\u8F93\u51FA\u957F\u5EA6\u9650\u5236\uFF0C\u56DE\u7B54\u5C1A\u672A\u5B8C\u6574\u3002" });
    if (isNode(node, 'model-retry'))
        return node.data.current.retryState === 'scheduled'
            ? _jsx("div", { className: css.notice, role: "status", children: "\u6A21\u578B\u8BF7\u6C42\u672A\u6210\u529F\uFF0C\u6B63\u5728\u7B49\u5F85\u91CD\u8BD5\u3002\u8BE6\u60C5\u4FDD\u7559\u5728\u6267\u884C\u8FC7\u7A0B\u4E2D\u3002" }) : null;
    if (isNode(node, 'command')) {
        if (node.data.outcome?.kind === 'error')
            return _jsxs("div", { className: css.error, role: "alert", children: ["\u547D\u4EE4\u6267\u884C\u5931\u8D25\uFF1A", node.data.outcome.text ?? node.data.name ?? '查看原对话中的命令记录'] });
        return node.data.outcome?.text ? _jsx(MarkdownText, { text: node.data.outcome.text, labels: markdownLabels }) : null;
    }
    if (isNode(node, 'manual-compaction')) {
        if (node.data.command.outcome?.kind === 'error')
            return _jsxs("div", { className: css.error, role: "alert", children: ["\u4E0A\u4E0B\u6587\u538B\u7F29\u5931\u8D25\uFF1A", node.data.command.outcome.text] });
        return node.data.compaction ? _jsx("p", { className: css.meta, children: "\u4E0A\u4E0B\u6587\u5DF2\u6574\u7406\uFF0C\u539F\u59CB\u8BB0\u5F55\u4ECD\u4FDD\u7559\u3002" }) : _jsx("p", { className: css.meta, children: "\u6B63\u5728\u6574\u7406\u4E0A\u4E0B\u6587\u2026" });
    }
    if (node.kind === 'compaction')
        return _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: "\u4E0A\u4E0B\u6587\u5DF2\u6574\u7406\uFF0C\u67E5\u770B\u8BB0\u5F55" }), _jsx(JsonBlock, { label: "\u538B\u7F29\u8BB0\u5F55", payload: node.data, truncatedLabel: truncatedJsonLabel })] });
    if (node.kind === 'context' || node.kind === 'turn-tail')
        return null;
    return _jsxs("div", { className: css.unknown, "data-reader-anchor": true, children: [_jsxs("p", { children: ["\u6B64\u8BB0\u5F55\u7C7B\u578B\u6682\u672A\u63A5\u5165\u9605\u8BFB\u9875\uFF1A", node.kind] }), _jsx(JsonBlock, { label: "\u67E5\u770B\u539F\u59CB\u8BB0\u5F55", payload: node.data, truncatedLabel: truncatedJsonLabel })] });
});
function GroupStatus({ group, useChat, motion }) {
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
    const busy = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open');
    return _jsx(StatusText, { text: text, motion: motion, shimmer: busy });
}
const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }) {
    const chat = props.useChat(snapshot => snapshot);
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
    const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => chat.nodes.get(key)), [chat, group, mainKeys, turn]);
    const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(chat.nodes.get(item.nodeKey), boundary));
    // Only a real, still-active text selection delays folding. Merely clicking,
    // focusing or scrolling the live card does not create a permanent override.
    const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
    const expanded = holdingSelection || processExpanded(expansionChoice, boundary);
    const shared = { useChat: props.useChat, renderSlotChain: props.renderSlotChain, loadImage: props.loadImage };
    const terminal = terminalLabel(boundary.reason);
    return _jsxs("section", { className: css.turn, "data-reader-turn": group.turn ?? 'unresolved', "data-reader-turn-state": boundary.status, "data-reader-turn-result": boundary.reason ?? undefined, children: [startsWithUser && _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: group.keys[0] }) }), hasProcess && _jsx(Disclosure, { open: expanded, onChange: setExpanded, controls: flowId, buttonRef: processButton, label: _jsx(GroupStatus, { group: group, useChat: props.useChat, motion: motion }), status: turn?.steps.length ? `${turn.steps.length} 个步骤` : undefined }), !hasProcess && boundary.status === 'open' && _jsx("div", { className: css.disclosure, "data-reader-status-only": true, children: _jsx(GroupStatus, { group: group, useChat: props.useChat, motion: motion }) }), _jsx("div", { id: flowId, className: css.mainFlow, "data-reader-flow": true, children: flow.map(item => item.kind === 'node' ? _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessNode, { useChat: props.useChat, t: props.t, nodeKey: item.nodeKey, open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(AssistantNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded }) })] }, item.key) : _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessFragment, { open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton, nodeKey: item.key, framed: true, children: _jsx(ToolActivity, { ...shared, entry: item, motion: motion, turnClosed: boundary.status === 'closed', onRead: pinProcess }) }) }), item.block && _jsx(BlockBoundary, { children: _jsx(ToolMedia, { ...shared, block: item.block }) })] }, item.key)) }), terminal && _jsx("div", { className: css.notice, "data-reader-terminal": true, children: terminal })] });
});
export function Reader(props) {
    const root = useRef(null);
    const activatedAt = useRef(Date.now());
    const order = props.useChat(snapshot => snapshot.order);
    const nodes = props.useChat(snapshot => snapshot.nodes);
    const timeline = props.useChat(snapshot => snapshot.timeline);
    const pending = props.useSessionPendingInteraction(snapshot => snapshot.get(props.sessionId));
    const openError = props.useSession(snapshot => snapshot.openError);
    const loading = props.useSession(snapshot => snapshot.openState === 'loading');
    const hasMore = props.useSession(snapshot => snapshot.hasMore);
    const loadingOlder = props.useSession(snapshot => snapshot.loadingOlder);
    const motionPreference = props.useStore(state => state.motion);
    const motion = useMotionAllowed(motionPreference);
    const streamMotion = useMemo(() => ({ enabled: motion, activatedAt: activatedAt.current }), [motion]);
    const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes, timeline]);
    const scroll = useReadingScroll(root, motion);
    const pinnedKeys = usePinnedSelection(root);
    const selectedProcessKeys = usePinnedSelection(root, '[data-reader-process]');
    const [historyError, setHistoryError] = useState(false);
    return _jsx(StreamMotionContext.Provider, { value: streamMotion, children: _jsx("div", { ref: root, className: css.root, "data-dsh-better-display": "0.2.3", "data-motion": motion ? 'on' : 'off', children: _jsxs("div", { className: css.column, children: [_jsxs("div", { className: css.toolbar, "data-ud-check": "reader-toolbar", children: [_jsx("span", { title: "\u57FA\u4E8E\u771F\u5B9E\u6D88\u606F\u7C7B\u578B\u548C\u8F6E\u6B21\u8FB9\u754C\u6574\u7406\u3002\u5F53\u524D\u534F\u8BAE\u6CA1\u6709\u72EC\u7ACB\u7684\u6B63\u6587\u9636\u6BB5\u6807\u8BB0\uFF0C\u65E0\u6CD5\u786E\u8BA4\u7684\u5185\u5BB9\u4F1A\u7EE7\u7EED\u4FDD\u7559\u3002", children: "\u9605\u8BFB \u00B7 \u539F\u59CB\u8BB0\u5F55\u5B8C\u6574\u4FDD\u7559" }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": motionPreference, onClick: () => props.actions.setMotion(!motionPreference), title: "\u65B0\u5230\u6587\u5B57\u67D4\u548C\u663E\u73B0\uFF0C\u8FC7\u7A0B\u5E73\u6ED1\u5C55\u5F00\uFF1B\u5173\u95ED\u540E\u7ACB\u5373\u5B8C\u6574\u663E\u793A\uFF0C\u81EA\u52A8\u9075\u5FAA\u7CFB\u7EDF\u51CF\u5C11\u52A8\u6001\u6548\u679C\u8BBE\u7F6E\u3002", children: motionPreference && !motion ? '动效 · 跟随系统关闭' : `动效${motionPreference ? '开' : '关'}` })] }), hasMore && _jsx("button", { type: "button", className: css.historyButton, disabled: loadingOlder, onClick: async () => {
                            setHistoryError(false);
                            try {
                                await props.loadOlder();
                            }
                            catch {
                                setHistoryError(true);
                            }
                        }, children: loadingOlder ? '正在加载更早记录' : '加载更早记录' }), historyError && _jsx("div", { className: css.notice, children: "\u5386\u53F2\u8BB0\u5F55\u52A0\u8F7D\u5931\u8D25\uFF0C\u53EF\u518D\u6B21\u5C1D\u8BD5\uFF1B\u73B0\u6709\u5185\u5BB9\u672A\u6539\u53D8\u3002" }), openError && _jsxs("div", { className: css.error, role: "alert", children: ["\u4F1A\u8BDD\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\uFF1A", openError.message] }), loading && groups.length === 0 && _jsx("p", { className: css.empty, role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u2026" }), groups.map(group => _jsx(TurnGroup, { ...props, group: group, motion: motion, pinnedKeys: pinnedKeys, selectedProcessKeys: selectedProcessKeys }, group.key)), pending !== undefined && _jsxs("div", { className: css.attention, role: "alert", "data-reader-attention": true, children: [_jsx("strong", { children: pending.kind === 'question' ? '需要你回答一个问题' : '需要你的确认' }), _jsx("span", { children: "\u8BF7\u5728\u4E0B\u65B9\u539F\u751F\u64CD\u4F5C\u533A\u5904\u7406\u3002\u6B64\u63D0\u793A\u4E0D\u4F1A\u6536\u8FDB\u6267\u884C\u8FC7\u7A0B\u3002" })] }), scroll.detached && _jsx("div", { className: css.jumpDock, children: _jsx("button", { type: "button", className: css.jump, onClick: scroll.jump, children: "\u2193 \u56DE\u5230\u6700\u65B0" }) })] }) }) });
}
//# sourceMappingURL=Reader.js.map