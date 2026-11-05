import type { Context } from '@deepseek-ai/cordis';
import { UNKNOWN_DESKTOP, desktopFromHost, type RevealDesktop } from './reveal.js';

/**
 * Ask the Host what it can do with a produced path.
 *
 * The official `GET /api/present.host` route answers
 * `sessionController.workspaceDesktop()` — `{ name, available, fileManager }` — which is
 * exactly the question「在文件夹中显示」has to answer honestly: a headless NAS reports
 * `available: false` with `fileManager: "directory"`, where a hand-rolled `xdg-open`
 * silently spawned into nothing and reported success. Hosts without the route fall back
 * to the Session remote's own `canOpenWorkspacePath`.
 *
 * Memoized: the answer is a property of the Host, and every chip shares one request.
 */
let desktopProbe: Promise<RevealDesktop> | undefined;
export function probeRevealDesktop(ctx: Context): Promise<RevealDesktop> {
  desktopProbe ??= (async (): Promise<RevealDesktop> => {
    try {
      // Relative on purpose: inside the fnOS app gateway this page lives under
      // /app/deepseek-harness/fngateway/, and an absolute /api/... would bypass the
      // prefix and 404 at the desktop's nginx. The Host's own clients resolve the same
      // way, which is why they work in both places.
      const res = await fetch('api/present.host', {
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (res.ok) {
        const payload: unknown = await res.json();
        const desktop = desktopFromHost(payload);
        if (desktop.available || desktop.fileManager !== null) return desktop;
      }
    } catch {
      // Route absent on an older Host: fall through to the Session remote.
    }
    try {
      const remote = ctx.remote as unknown as { session?: { canOpenWorkspacePath?: () => Promise<{ ok: boolean; value?: boolean }> } } | undefined;
      const answer = await remote?.session?.canOpenWorkspacePath?.();
      if (answer?.ok === true) {
        return { name: undefined, available: answer.value === true, fileManager: null };
      }
    } catch {
      // No answer at all: stay with the honest default.
    }
    return UNKNOWN_DESKTOP;
  })();
  return desktopProbe;
}
