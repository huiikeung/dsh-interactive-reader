import { executionFacts } from './tool-activity.js';
/**
 * Separate a sent message into bubble text and attachment rows.
 *
 * Attachments leave the bubble in the native chat, and a `file` receipt is a
 * card, not raw JSON — so the reading view reads the same durable content the
 * same way instead of falling through to the unknown-block notice.
 */
export function splitUserContent(content) {
    const texts = [];
    const images = [];
    const files = [];
    const rest = [];
    for (const block of content) {
        const part = block;
        if (part.type === 'text' && typeof part.text === 'string')
            texts.push(part.text);
        else if (part.type === 'image' && part.attachment !== undefined)
            images.push(part.attachment);
        else if (part.type === 'file' && part.attachment !== undefined)
            files.push(part.attachment);
        else
            rest.push(block);
    }
    return { text: texts.join(''), images, files, rest };
}
/** Map durable content blocks onto the reader's own block vocabulary. */
export function contentBlocks(content) {
    return content.map(block => {
        if (block.type === 'text')
            return { kind: 'text', text: block.text };
        if (block.type === 'image')
            return { kind: 'image', attachment: block.attachment };
        return { kind: 'other', block };
    });
}
// Run on structural publication, not on each text delta. Node seats subscribe by key.
export function groupNodes(order, get) {
    const groups = [];
    const seenTurns = new Set();
    for (const key of order) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        const turn = node.location.kind === 'step' || node.location.kind === 'turn' ? node.location.turn.turn : null;
        const previous = groups.at(-1);
        if (turn !== null && previous?.turn === turn) {
            previous.keys.push(key);
        }
        else {
            groups.push({ key: turn === null ? `node:${key}` : seenTurns.has(turn) ? `turn:${turn}:${key}` : `turn:${turn}`, turn, keys: [key] });
            if (turn !== null)
                seenTurns.add(turn);
        }
    }
    return groups;
}
export function boundaryOf(turn) {
    return {
        status: turn?.status ?? 'unknown',
        reason: turn?.end?.data.reason.kind ?? null,
        latestStep: turn?.steps.at(-1)?.step ?? -1,
        closingStep: turn?.data.get('turn-tail')?.closing?.step ?? null,
    };
}
export function isEarlierNarration(data, boundary) {
    // New body text, a tool call, or a settled step is not a completed turn.
    if (data.status !== 'settled' || boundary.status !== 'closed' || boundary.reason !== 'completed')
        return false;
    if (data.blocks.some(block => block.kind === 'image' || block.kind === 'other'))
        return false;
    return boundary.closingStep !== null && data.step < boundary.closingStep;
}
export function processExpanded(choice, boundary) {
    return choice ?? !(boundary.status === 'closed' && boundary.reason === 'completed');
}
/** Reading while running must not pin the process open after completion. */
export function processChoiceKey(groupKey, boundary) {
    return `${groupKey}:${boundary.status}:${boundary.reason ?? 'pending'}`;
}
/** A body-only assistant step is not a thinking/process disclosure. */
export function hasProcessContent(node, boundary) {
    if (!node || node.visibility === 'hidden')
        return false;
    if (node.kind === 'assistant-step') {
        const data = node.data;
        return data.blocks.some(block => block.kind === 'reasoning' && block.text.trim() !== '')
            || (isEarlierNarration(data, boundary) && hasVisibleBody(data.blocks));
    }
    return node.kind === 'context' || node.kind === 'model-retry'
        || node.kind === 'command' || node.kind === 'manual-compaction';
}
export function hasVisibleBody(blocks) {
    return blocks.some(block => block.kind === 'image' || block.kind === 'other' || (block.kind === 'text' && block.text.trim() !== ''));
}
/** Keep native block order. In particular, never lift a later Think above text. */
export function assistantSegments(blocks) {
    const segments = [];
    let previous;
    blocks.forEach((block, index) => {
        if (block.kind === 'tool-call') {
            previous = undefined;
            return;
        }
        const kind = block.kind === 'reasoning' ? 'reasoning' : 'body';
        if (previous?.kind === kind)
            previous.blocks.push(block);
        else {
            previous = { kind, start: index, blocks: [block] };
            segments.push(previous);
        }
    });
    return segments;
}
export function toolFailed(block) {
    const { exitCode, signal } = executionFacts(block);
    return ('kind' in block && block.isError) || !!signal || (exitCode !== undefined && exitCode !== 0) || block.subCalls.some(toolFailed);
}
export function toolName(block) {
    return 'kind' in block ? block.call?.name ?? '工具调用' : block.name;
}
export function terminalLabel(reason) {
    switch (reason) {
        case 'completed': return null;
        case 'aborted':
        case 'interrupted': return '本轮已停止，已生成的内容仍保留。';
        case 'blocked': return '本轮需要处理阻塞事项；请查看原对话与下方操作区。';
        case 'max-tokens': return '输出达到本轮长度限制，内容可能尚未完整。';
        case 'error': return '本轮未完成；错误信息保留在下方。';
        case null: return null;
        default: return `本轮结束状态：${reason}。请在原对话中核对完整记录。`;
    }
}
//# sourceMappingURL=projection.js.map