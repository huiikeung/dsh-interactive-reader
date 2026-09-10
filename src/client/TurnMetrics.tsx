import { memo, useEffect, useRef, useState } from 'react';
import css from './TurnMetrics.module.css';

interface TurnTokenUsageRoute {
  readonly provider: string;
  readonly model: string;
}

interface TurnTokenUsage {
  readonly uncachedInputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly reasoningTokens?: number;
  readonly inputTokens?: number;
  readonly routes?: readonly TurnTokenUsageRoute[];
}

interface TurnMetricsProps {
  usage?: TurnTokenUsage;
  runMs?: number;
  tokensPerSecond?: number;
  ttftMs?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M tok`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k tok`;
  return `${count} tok`;
}

export const TurnMetrics = memo(function TurnMetrics({
  usage,
  runMs,
  tokensPerSecond,
  ttftMs,
}: TurnMetricsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const hasTiming = typeof runMs === 'number' && runMs > 0;
  const hasTokens = !!usage && typeof usage.totalTokens === 'number' && usage.totalTokens > 0;

  if (!hasTiming && !hasTokens) return null;

  // Build compact pill label
  const pillParts: string[] = [];
  if (hasTiming) pillParts.push(formatDuration(runMs!));
  if (typeof tokensPerSecond === 'number' && tokensPerSecond > 0) {
    pillParts.push(`${tokensPerSecond.toFixed(0)} tok/s`);
  } else if (hasTokens) {
    pillParts.push(formatTokens(usage!.totalTokens));
  }

  const cacheHitPercent = usage?.cacheReadTokens && usage?.totalTokens && usage.totalTokens > usage.outputTokens
    ? Math.round((usage.cacheReadTokens / (usage.totalTokens - usage.outputTokens)) * 100)
    : null;

  return (
    <span className={css.container} ref={containerRef}>
      <button
        type="button"
        className={css.pillButton}
        data-active={open}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        title="查看本轮耗时、吞吐与 Token 消耗概况"
      >
        <svg className={css.pillIcon} viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 5v3.5l2.5 1.5" strokeLinecap="round" />
        </svg>
        {pillParts.join(' · ')}
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginLeft: 2 }}>
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {open && (
          <span className={css.metricsPop} role="dialog" aria-label="本轮性能与用量概况">
            <span className={css.popHeader}>
              <span>本轮性能与用量概况</span>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }} aria-label="关闭">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              </button>
            </span>

            {hasTiming && (
              <span className={css.popSection}>
                <span className={css.popSectionTitle}>耗时与生成速度</span>
                <span className={css.popGrid}>
                  <span className={css.popLabel}>总用时</span>
                  <span className={css.popValue}>{formatDuration(runMs!)}</span>

                  {typeof tokensPerSecond === 'number' && tokensPerSecond > 0 && (
                    <>
                      <span className={css.popLabel}>生成吞吐 (TPS)</span>
                      <span className={css.popValue}>{tokensPerSecond.toFixed(1)} tok/s</span>
                    </>
                  )}

                  {typeof ttftMs === 'number' && ttftMs > 0 && (
                    <>
                      <span className={css.popLabel}>首字延迟 (TTFT)</span>
                      <span className={css.popValue}>{(ttftMs / 1000).toFixed(2)}s</span>
                    </>
                  )}
                </span>
              </span>
            )}

            {hasTokens && (
              <span className={css.popSection}>
                <span className={css.popSectionTitle}>Token 消耗分解</span>
                <span className={css.popGrid}>
                  <span className={css.popLabel}>总消耗</span>
                  <span className={css.popValue}>{usage!.totalTokens.toLocaleString()} tok</span>

                  {usage!.inputTokens !== undefined && (
                    <>
                      <span className={css.popLabel}>输入</span>
                      <span className={css.popValue}>
                        {typeof usage!.cacheReadTokens === 'number' && usage!.cacheReadTokens > 0 && <>缓存读取 {usage!.cacheReadTokens.toLocaleString()} tok · </>}
                        {(usage!.inputTokens ?? 0).toLocaleString()} tok
                      </span>
                    </>
                  )}

                  <span className={css.popLabel}>输出</span>
                  <span className={css.popValue}>
                    {typeof usage!.reasoningTokens === 'number' && usage!.reasoningTokens > 0 && <>思考 {usage!.reasoningTokens.toLocaleString()} · </>}
                    {(usage!.outputTokens ?? 0).toLocaleString()} tok
                  </span>
                </span>
              </span>
            )}
          </span>
        )}
      </button>
    </span>
  );
});
