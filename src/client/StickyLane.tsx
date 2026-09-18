import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Publish real lane geometry; wrapped labels must not collide with statistics. */
export function StickyLane({ kind, className, children }: { kind: 'toolbar' | 'status'; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const scope = el?.closest<HTMLElement>(kind === 'toolbar' ? '[data-dsh-better-display]' : '[data-reader-turn]');
    if (!el || !scope) return;
    const property = kind === 'toolbar' ? '--reader-toolbar-height' : '--reader-status-height';
    const update = () => {
      scope.style.setProperty(property, `${el.getBoundingClientRect().height}px`);
      if (kind !== 'toolbar') return;
      // The status lane reserves the toolbar's whole control cluster, so measure
      // every control rather than the first one — the toolbar carries more than
      // one toggle.
      const controls = [...el.querySelectorAll('button')];
      const width = controls.reduce((sum, control) => sum + control.getBoundingClientRect().width, 0);
      scope.style.setProperty('--reader-control-width', `${(width || 80) + 20}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const controls = kind === 'toolbar' ? [...el.querySelectorAll('button')] : [];
    for (const control of controls) observer.observe(control);
    return () => { observer.disconnect(); scope.style.removeProperty(property); if (kind === 'toolbar') scope.style.removeProperty('--reader-control-width'); };
  }, [kind]);
  return <div ref={ref} className={className} data-reader-lane={kind} data-ud-check={kind === 'toolbar' ? 'reader-toolbar' : undefined}>{children}</div>;
}
