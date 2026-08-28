import { memo } from 'react';
import type { ModelRetryNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import css from './Reader.module.css';

const retrySeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1_000));
const maximum = (node: ModelRetryNode) => (node.mode === 'normal' ? node.maxRetries : '∞');
const stateLabel = (state: ModelRetryNode['retryState']) =>
  state === 'scheduled' ? '等待重试模型请求' : state === 'started' ? '已重试模型请求' : state === 'cancelled' ? '模型请求重试已取消' : '模型请求重试';
const failureMessage = (message: string | undefined, code: unknown) => (code === 'AUTH' ? 'API 密钥无效' : message ?? '未知错误');

/** Native-style model-retry disclosure, mirroring DSH's default renderer: a quiet `details` row. */
export const RetryItem = memo(function RetryItem({ node }: { node: ModelRetryNode }) {
  const active = node.retryState === 'scheduled';
  const label = active ? '正在重试模型请求' : stateLabel(node.retryState);
  const max = maximum(node);
  const secs = retrySeconds(node.delayMs);
  return (
    <details className={css.retryRow} data-active={active || undefined} data-reader-anchor>
      <summary className={css.retrySummary}>
        <span className={css.retryText} role="status">{label}（{node.retry}/{max}） · {secs}s</span>
      </summary>
      <div className={css.retryDetails}>
        <div><span className={css.retryDetailLabel}>重试延迟：</span>{node.delayMs} 毫秒</div>
        <div><span className={css.retryDetailLabel}>失败原因：</span>{failureMessage(node.failure?.message, node.failure?.code)}</div>
      </div>
    </details>
  );
});
