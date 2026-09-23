import type { TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ReaderFlowEntry } from './tool-activity.js';
/** Extract standard filename without directory components. */
export declare function basename(path: string): string;
/** Extract parent directory of a path (or '.' if top-level). */
export declare function dirname(path: string): string;
/**
 * The produced-files chip row waits for turn close. Live writes still
 * accumulate, but the row must not interrupt an in-progress process.
 */
export declare function showDeliverablesRow(status: 'open' | 'closed' | 'unknown', paths: readonly string[]): boolean;
/**
 * Extract all unique file paths produced/modified in one turn.
 * Respects official deliverables data when available, and falls back to
 * inspecting successful write/edit tool invocations in the turn flow.
 */
export declare function getTurnDeliverables(turn: TurnLocation | undefined, flow?: readonly ReaderFlowEntry[]): readonly string[];
/**
 * File-mention resolver: converts inline-code tokens matching produced paths
 * into clickable file references that open the corresponding file on the host.
 */
export declare function createProducedFileMentions(paths: readonly string[], openFile: (path: string) => void): MarkdownFileMentions;
/**
 * Prefer the Host's official prose file-mention resolver, falling back to the
 * produced-path matcher only where the official one declines.
 *
 * Both answer the same question — "is this inline-code token a workspace file, and
 * what does opening it do" — so they compose: the official resolver knows the full
 * workspace vocabulary (paths the turn never produced, basenames, workspace-relative
 * spellings), while ours covers exactly the paths this turn produced. Composing keeps
 * the reading tab working on a Host with no `chatFileMentions` provider, and adds the
 * official vocabulary rather than replacing what already answered.
 */
export declare function composeFileMentions(official: MarkdownFileMentions | undefined, produced: MarkdownFileMentions | undefined): MarkdownFileMentions | undefined;
//# sourceMappingURL=deliverables.d.ts.map