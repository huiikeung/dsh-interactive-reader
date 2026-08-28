import { useState } from 'react';
import type { ModelRetryNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { IconChevronDownOutline14, IconQueueOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './Reader.module.css';

const duration = (ms: number) => ms < 1000 ? `${Math.round(ms)} 毫秒` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} 秒`;
const stateLabel = (state: ModelRetryNode['retryState']) =>
  state === 'scheduled' ? '等待重试' : state === 'started' ? '已开始' : state === 'cancelled' ? '已取消' : '记录';

/** Structured model-retry disclosure instead of the raw JSON fallback. */
export function RetryCard({ attempts }: { attempts: readonly ModelRetryNode[] }) {
  const [open, setOpen] = useState(false);
  const current = attempts[0];
  const summary = current === undefined
    ? `${attempts.length} 次尝试`
    : `第 ${current.retry} 次 · ${stateLabel(current.retryState)}`;
  return (
    <div className={css.retry} data-open={open || undefined}>
      <button type="button" className={css.retryHeader} aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <IconQueueOutline14 className={css.retryIcon} />
        <span className={css.retryTitle}>模型重试记录</span>
        <span className={css.retryMeta}>{summary}</span>
        <IconChevronDownOutline14 className={css.retryChevron} />
      </button>
      {open && <div className={css.retryBody}>
        {attempts.length === 0 && <p className={css.retryEmpty}>已重试，无详细记录。</p>}
        {attempts.map((attempt, index) => (
          <div key={attempt.seq ?? index} className={css.retryItem}>
            <div className={css.retryItemHead}>
              <span>第 {attempt.retry} 次尝试</span>
              {attempt.provider && <span className={css.retryItemTag}>{attempt.provider}</span>}
              <span className={css.retryItemDelay}>延时 {duration(attempt.delayMs)}</span>
              <span className={css.retryItemState}>{stateLabel(attempt.retryState)}</span>
            </div>
            <div className={css.retryItemFailure}>
              {attempt.failure?.message ?? '未知错误'}
              {attempt.failure?.code !== undefined && <span className={css.retryItemCode}>{String(attempt.failure.code)}</span>}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
