import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { resolveWorkspacePath } from '@deepseek-ai/dsh-util-workspace-path';
import * as workspacePathPkg from '@deepseek-ai/dsh-util-workspace-path';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { installReaderEntry } from './entry.js';
import { installBetterDisplaySettings } from './settings.js';
import { fillComposerDom } from './mcp-app.js';
import { fileAddressFor, isFolderOpenPath, modeFromSnapshot, openDeliverableFile } from './open-file.js';
import { copyToClipboard } from './clipboard.js';
import { folderAddressOf, installFolderPane } from './folder-pane.js';
import {
  UNKNOWN_DESKTOP,
  desktopFromHost,
  revealFolderOf,
  revealPlanFor,
  type RevealDesktop,
  type RevealOutcome,
} from './reveal.js';
import type { ReaderInjected } from './types.js';

/** Structural face of the sanctioned per-session composer writer. */
interface ComposerShell {
  setDraft: (text: string) => void;
}
interface ConversationFace {
  input?: { shell?: (id: SessionId) => ComposerShell };
}

interface SidebarRightFace {
  openResource?: (address: string, options?: { params?: { line?: number } }) => void;
}

const officialFileAddressFor = (workspacePathPkg as {
  fileAddressFor?: typeof fileAddressFor;
}).fileAddressFor;

async function openWorkspacePath(
  ctx: Context,
  path: string,
  action?: 'reveal',
): Promise<boolean> {
  const remote = ctx.remote as unknown as { session?: { openWorkspacePath: (arg: { path: string; action?: 'reveal' }) => Promise<{ ok: boolean; error?: { message: string } }> } } | undefined;
  const remoteSession = remote?.session
    ?? (ctx.get?.('remote.session') as unknown as { openWorkspacePath: (arg: { path: string; action?: 'reveal' }) => Promise<{ ok: boolean; error?: { message: string } }> } | undefined)
    ?? ((ctx.get?.('remote') as unknown as { session?: { openWorkspacePath: (arg: { path: string; action?: 'reveal' }) => Promise<{ ok: boolean; error?: { message: string } }> } })?.session);
  if (!remoteSession?.openWorkspacePath) {
    console.warn('[dsh-better-display] remote.session is not available');
    return false;
  }
  const result = await remoteSession.openWorkspacePath(action === undefined ? { path } : { path, action });
  if (!result?.ok) {
    console.warn('[dsh-better-display] openWorkspacePath failed:', result?.error?.message);
    return false;
  }
  return true;
}

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
function probeRevealDesktop(ctx: Context): Promise<RevealDesktop> {
  desktopProbe ??= (async (): Promise<RevealDesktop> => {
    try {
      const res = await fetch('/api/present.host', {
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

/** Open a URL in a new tab, reporting whether the browser actually took it. */
function openInNewTab(url: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.open(url, '_blank', 'noopener,noreferrer') !== null;
  } catch {
    return false;
  }
}

/** Read the configured fnOS file-manager template, tolerating a broken store read. */
function fnosTemplateOf(prefs: { getSnapshot?: () => { fnosFileManagerUrl?: string } }): string {
  try {
    return prefs.getSnapshot?.()?.fnosFileManagerUrl ?? '';
  } catch {
    return '';
  }
}

/** The shell's right-sidebar face, whichever of the two shapes this build exposes. */
function sidebarRightOf(ctx: Context): SidebarRightFace | undefined {
  return (ctx.get?.('sidebarRight')
    ?? (ctx as unknown as { sidebarRight?: SidebarRightFace }).sidebarRight) as SidebarRightFace | undefined;
}

/**
 * Show one folder in the plugin's own right-sidebar pane.
 *
 * This is the last target that still displays something on a Host with no desktop;
 * it needs both the shell's tab service (to have routed our address type) and the
 * sidebar face (to open the tab).
 */
function openFolderPane(ctx: Context, folder: string): boolean {
  const sidebar = sidebarRightOf(ctx);
  if (typeof sidebar?.openResource !== 'function') return false;
  try {
    sidebar.openResource(folderAddressOf(folder));
    return true;
  } catch (error) {
    console.warn('[dsh-better-display] opening the folder pane failed:', error);
    return false;
  }
}

export type { ReaderBlockOwner } from './types.js';
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-better-display-client';
export const inject = ['slots', 'sessions', 'conversation', 'remote', 'remote.session', 'remote.workspaceFiles'];

/**
 * Pin this plugin's settings-nav glyph at runtime.
 *
 * The `settings.section` slot contract carries no icon field — the core reads
 * only id/label/order, and its `navIcon(id)` falls back to the settings gear for
 * every unknown id. Patching that core bundle is not durable (a DSH runtime
 * re-extract, or another plugin installing or removing its own patch, wipes it),
 * so find our own nav cell and rewrite its <svg> in place instead: the shell's
 * element, class and box are kept, so nothing depends on the shell's hashed
 * class names, and a MutationObserver re-applies the glyph whenever the shell
 * re-renders the nav and would otherwise restore the gear.
 */
function pinNavGlyph(labels: readonly string[], mark: string, glyph: () => { viewBox: string; markup: string }): void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const applyGlyph = () => {
    // Cheap guard: the nav only exists while the settings panel is open.
    if (document.querySelector('[role="dialog"]') === null) return;
    for (const cell of Array.from(document.querySelectorAll('[role="dialog"] nav button'))) {
      // An <svg> contributes no text, so this is exactly the nav label.
      if (labels.indexOf(cell.textContent?.trim() ?? '') < 0) continue;
      const svg = cell.querySelector('svg');
      if (svg === null || svg.getAttribute(mark) === '1') continue;
      // glyph() is pure and returns the markup: it runs to completion BEFORE any
      // DOM mutation, so a throwing glyph leaves the shell's own icon in place
      // instead of blanking the nav cell.
      let spec: { viewBox: string; markup: string };
      try {
        spec = glyph();
      } catch (error) {
        console.warn('[dsh-better-display] nav glyph failed; keeping the shell icon', error);
        continue;
      }
      svg.setAttribute('viewBox', spec.viewBox);
      svg.setAttribute('fill', 'none');
      svg.innerHTML = spec.markup;
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute(mark, '1');
    }
  };
  applyGlyph();
  new MutationObserver(applyGlyph).observe(document.body, { childList: true, subtree: true });
}

export function apply(ctx: Context): void {
  const store = createReaderStore();
  // Settings-nav glyph. `settings.section` has no icon field, so without this the
  // section renders the core's gear fallback. Pinned from here so it survives DSH
  // runtime updates and other plugins' patches.
  pinNavGlyph(['交互阅读', 'Better Display'], 'data-better-display-nav-icon', () => ({
    viewBox: '0 0 16 16',
    markup: '<path d="M11.2426 4.80473V6.10551H4.75819V4.80473H11.2426Z" fill="currentColor"></path>'
      + '<path d="M9.40858 7.84478V9.14557H4.75819V7.84478H9.40858Z" fill="currentColor"></path>'
      + '<path d="M9.23438 0.546389C10.1941 0.546389 10.9683 0.544914 11.5859 0.611819C12.2161 0.680096 12.7634 0.825745 13.2393 1.17139C13.5172 1.3733 13.7619 1.61812 13.9639 1.896C14.3096 2.37183 14.4551 2.91922 14.5234 3.54932C14.5903 4.16686 14.5889 4.94133 14.5889 5.90088V10.0981C14.5889 11.0576 14.5903 11.8321 14.5234 12.4497C14.4552 13.0798 14.3094 13.6272 13.9639 14.103C13.7619 14.381 13.5172 14.6257 13.2393 14.8276C12.7633 15.1734 12.2163 15.3189 11.5859 15.3872C10.9683 15.4541 10.1942 15.4536 9.23438 15.4536H6.76563C5.80591 15.4536 5.03168 15.4541 4.41407 15.3872C3.78385 15.3189 3.23665 15.1734 2.76074 14.8276C2.48291 14.6257 2.23802 14.3809 2.03614 14.103C1.69066 13.6272 1.54483 13.0798 1.47657 12.4497C1.40973 11.8321 1.41114 11.0576 1.41114 10.0981V5.90088C1.41113 4.94132 1.40966 4.16686 1.47657 3.54932C1.54488 2.91921 1.69042 2.37184 2.03614 1.896C2.2381 1.61807 2.4828 1.37333 2.76074 1.17139C3.23665 0.825682 3.78386 0.680109 4.41407 0.611819C5.03168 0.544905 5.80591 0.546389 6.76563 0.546389H9.23438ZM6.76563 1.896C5.77586 1.896 5.0876 1.89738 4.55957 1.95459C4.0443 2.01043 3.76214 2.11349 3.55469 2.26416C3.39135 2.38284 3.24761 2.52662 3.12891 2.68994C2.97821 2.89736 2.8752 3.17967 2.81934 3.69483C2.76214 4.22279 2.76075 4.91131 2.76074 5.90088V10.0981C2.76074 11.0876 2.76221 11.7762 2.81934 12.3042C2.87516 12.8194 2.97829 13.1026 3.12891 13.3101C3.24754 13.4733 3.39147 13.6172 3.55469 13.7358C3.76213 13.8865 4.04438 13.9896 4.55957 14.0454C5.0876 14.1026 5.77586 14.103 6.76563 14.103H9.23438C10.2242 14.103 10.9124 14.1026 11.4404 14.0454C11.9556 13.9896 12.2379 13.8865 12.4453 13.7358C12.6086 13.6172 12.7525 13.4733 12.8711 13.3101C13.0217 13.1026 13.1248 12.8195 13.1807 12.3042C13.2378 11.7762 13.2393 11.0876 13.2393 10.0981V5.90088C13.2393 4.91131 13.2379 4.22279 13.1807 3.69483C13.1248 3.17969 13.0218 2.89736 12.8711 2.68994C12.7524 2.52667 12.6086 2.38281 12.4453 2.26416C12.2379 2.11355 11.9556 2.01041 11.4404 1.95459C10.9124 1.8974 10.2241 1.896 9.23438 1.896H6.76563Z" fill="currentColor"></path>',
  }));
  // conversation.view is session-scoped, so session persist keys are
  // `dsh.reader.v1.<sessionId>`. One root instance keeps glass, fold
  // intensity, and open-mode on the unsuffixed `dsh.reader.v1` key.
  const prefs = store.create();
  installBetterDisplaySettings(ctx, prefs);
  // The right-sidebar folder pane gives「在文件夹中显示」a target on a Host with no
  // desktop; it is skipped when the shell exposes no tab registry.
  installFolderPane(ctx);
  ctx.slots.inject('conversation.view', function* () {
    yield ctx.slots.register({
    name: 'conversation.view',
    id: 'reader',
    order: -5,
    label: () => '阅读',
    locale: 'chat',
    children: { 'dsh-better-display.block': { kind: 'chain', scope: 'session' } },
    store,
    inject: (sessionId: SessionId): ReaderInjected => {
      const session = () => {
        const current = ctx.sessions.binding(sessionId)?.session;
        if (!current) throw new Error('阅读页对应的会话已关闭。');
        return current;
      };
      return {
        openPrefs: prefs,
        probeRevealDesktop: () => probeRevealDesktop(ctx),
        fnosFileManagerTemplate: () => fnosTemplateOf(prefs),
        revealPaneAvailable: () => typeof sidebarRightOf(ctx)?.openResource === 'function',
        loadOlder: async () => { await session().loadOlder(); },
        loadImage: async attachment => {
          const receipt = await session().readAttachment(attachment.attachmentId);
          if (!receipt.ok) throw new Error(receipt.error.message);
          return { data: Uint8Array.from(receipt.value.data), mediaType: receipt.value.attachment.mediaType };
        },
        openFile: async (path: string) => {
          try {
            const cwd = ctx.sessions?.list?.getSnapshot?.()?.byId[sessionId]?.cwd;
            const sidebar = (
              ctx.get?.('sidebarRight')
              ?? (ctx as unknown as { sidebarRight?: SidebarRightFace }).sidebarRight
            ) as SidebarRightFace | undefined;
            await openDeliverableFile({
              path,
              mode: modeFromSnapshot(prefs),
              sessionId,
              cwd,
              resolveWorkspacePath,
              openExternal: async (absolutePath) => { await openWorkspacePath(ctx, absolutePath); },
              openSidebar: typeof sidebar?.openResource === 'function'
                ? (address) => { sidebar.openResource!(address); }
                : undefined,
              fileAddressFor: officialFileAddressFor ?? fileAddressFor,
              warn: (message, extra) => { console.warn(message, extra); },
            });
          } catch (error) {
            console.warn('[dsh-better-display] openFile error:', error);
          }
        },
        revealFile: async (path: string): Promise<RevealOutcome> => {
          try {
            const cwd = ctx.sessions?.list?.getSnapshot?.()?.byId[sessionId]?.cwd;
            const targetPath = resolveWorkspacePath(cwd, path);
            const folderTarget = isFolderOpenPath(path);
            const folder = folderTarget ? targetPath : revealFolderOf(targetPath);
            const template = fnosTemplateOf(prefs);
            const paneAvailable = typeof sidebarRightOf(ctx)?.openResource === 'function';

            // The fnOS target is opened before any `await`, so the click's own user
            // gesture is still current and no popup blocker eats the new tab.
            let plan = revealPlanFor({ folderPath: folder, template, paneAvailable });
            if (plan.kind === 'fnos' && openInNewTab(plan.url)) return 'fnos';
            if (plan.kind === 'probe' || plan.kind === 'fnos') {
              // Either there was nothing to ask, or the fnOS jump was refused; from
              // here the Host is the only remaining target, so its template is dropped.
              plan = revealPlanFor({
                folderPath: folder,
                template: '',
                desktop: await probeRevealDesktop(ctx),
                paneAvailable,
              });
            }
            if (plan.kind === 'native') {
              // The Host decides what "reveal" means per platform: Finder selects the
              // file, Explorer selects it, and a desktop Linux Host opens its parent.
              // A folder target is opened as itself instead of revealing its parent.
              if (await openWorkspacePath(ctx, targetPath, folderTarget ? undefined : 'reveal')) return 'external';
            }
            if (plan.kind === 'sidebar' && openFolderPane(ctx, folder)) return 'sidebar';
            return await copyToClipboard(folder) ? 'copied' : 'failed';
          } catch (error) {
            console.warn('[dsh-better-display] revealFile error:', error);
            return 'failed';
          }
        },
        forkAt: (seq: number) => {
          // A missing anchor would silently fork the whole session instead of
          // the intended turn prefix, so refuse it loudly rather than guessing.
          if (typeof seq !== 'number' || !Number.isFinite(seq)) {
            console.warn('[dsh-better-display] fork refused: missing anchor seq');
            return;
          }
          try {
            const sessionsApi = ctx.sessions as unknown as {
              fork: (arg: { sessionId: string; atSeq: number; increaseTitle: boolean }) => Promise<string>;
              open: (sessionId: string) => void;
            } | undefined;
            if (sessionsApi?.fork) {
              sessionsApi.fork({ sessionId, atSeq: seq, increaseTitle: true })
                .then(childId => { sessionsApi.open?.(childId); })
                .catch(err => { console.warn('[dsh-better-display] fork failed:', err); });
            }
          } catch (error) {
            console.warn('[dsh-better-display] forkAt error:', error);
          }
        },
        loadThrough: async (seq: unknown) => {
          try {
            const current = session() as unknown as { loadThrough?: (seq: unknown) => Promise<void> };
            if (typeof current?.loadThrough === 'function') {
              await current.loadThrough(seq);
            } else {
              await session().loadOlder();
            }
          } catch (error) {
            console.warn('[dsh-better-display] loadThrough error:', error);
          }
        },
        fillComposer: (text: string) => {
          // Sanctioned path: the conversation input shell owns the Lexical
          // editor, so setDraft lands in the draft store deterministically.
          try {
            const conversation = (ctx as unknown as { conversation?: ConversationFace }).conversation;
            const shell = conversation?.input?.shell?.(sessionId);
            if (shell && typeof shell.setDraft === 'function') {
              shell.setDraft(text);
              return true;
            }
          } catch {
            // Fall through to the DOM path below.
          }
          try {
            return fillComposerDom(text);
          } catch {
            return false;
          }
        },
        getToolView: (toolName: string) => {
          try {
            const slotsService = ctx.slots as unknown as { entriesOfSlot?: (name: string) => unknown[] };
            const entries = slotsService?.entriesOfSlot?.('tool.call.toolview') ?? [];
            const matches = entries.filter((e: any) => {
              const key = e?.options?.key ?? e?.key;
              const comp = e?.component ?? e?.view ?? e?.render ?? (typeof e === 'function' ? e : null);
              return key === toolName && typeof comp === 'function';
            });
            if (matches.length === 0) return null;
            matches.sort((a: any, b: any) => {
              const prioA = a?.options?.priority ?? a?.priority ?? 0;
              const prioB = b?.options?.priority ?? b?.priority ?? 0;
              return prioA - prioB;
            });
            const best = matches[0] as any;
            const prio = best?.options?.priority ?? best?.priority ?? 0;
            const comp = best?.component ?? best?.view ?? best?.render ?? (typeof best === 'function' ? best : null);
            if (prio < 0 || (toolName !== 'edit' && toolName !== 'write')) {
              return comp;
            }
            return null;
          } catch {
            return null;
          }
        },
      };
    },
    }, Reader);
    yield installReaderEntry(ctx);
  });
}
