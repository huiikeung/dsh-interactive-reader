import { resolveWorkspacePath } from '@deepseek-ai/dsh-util-workspace-path';
import * as workspacePathPkg from '@deepseek-ai/dsh-util-workspace-path';
import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { installReaderEntry } from './entry.js';
import { installBetterDisplaySettings } from './settings.js';
import { fillComposerDom } from './mcp-app.js';
import { fileAddressFor, isFolderOpenPath, modeFromSnapshot, openDeliverableFile } from './open-file.js';
import { copyToClipboard } from './clipboard.js';
import { folderAddressOf, installFolderPane } from './folder-pane.js';
import { UNKNOWN_DESKTOP, desktopFromHost, revealFolderOf, revealPlanFor, } from './reveal.js';
const officialFileAddressFor = workspacePathPkg.fileAddressFor;
async function openWorkspacePath(ctx, path, action) {
    const remote = ctx.remote;
    const remoteSession = remote?.session
        ?? ctx.get?.('remote.session')
        ?? (ctx.get?.('remote')?.session);
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
let desktopProbe;
function probeRevealDesktop(ctx) {
    desktopProbe ??= (async () => {
        try {
            const res = await fetch('/api/present.host', {
                headers: { accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const payload = await res.json();
                const desktop = desktopFromHost(payload);
                if (desktop.available || desktop.fileManager !== null)
                    return desktop;
            }
        }
        catch {
            // Route absent on an older Host: fall through to the Session remote.
        }
        try {
            const remote = ctx.remote;
            const answer = await remote?.session?.canOpenWorkspacePath?.();
            if (answer?.ok === true) {
                return { name: undefined, available: answer.value === true, fileManager: null };
            }
        }
        catch {
            // No answer at all: stay with the honest default.
        }
        return UNKNOWN_DESKTOP;
    })();
    return desktopProbe;
}
/** Open a URL in a new tab, reporting whether the browser actually took it. */
function openInNewTab(url) {
    try {
        if (typeof window === 'undefined')
            return false;
        return window.open(url, '_blank', 'noopener,noreferrer') !== null;
    }
    catch {
        return false;
    }
}
/** Read the configured fnOS file-manager template, tolerating a broken store read. */
function fnosTemplateOf(prefs) {
    try {
        return prefs.getSnapshot?.()?.fnosFileManagerUrl ?? '';
    }
    catch {
        return '';
    }
}
/** The shell's right-sidebar face, whichever of the two shapes this build exposes. */
function sidebarRightOf(ctx) {
    return (ctx.get?.('sidebarRight')
        ?? ctx.sidebarRight);
}
/**
 * Show one folder in the plugin's own right-sidebar pane.
 *
 * This is the last target that still displays something on a Host with no desktop;
 * it needs both the shell's tab service (to have routed our address type) and the
 * sidebar face (to open the tab).
 */
function openFolderPane(ctx, folder) {
    const sidebar = sidebarRightOf(ctx);
    if (typeof sidebar?.openResource !== 'function')
        return false;
    try {
        sidebar.openResource(folderAddressOf(folder));
        return true;
    }
    catch (error) {
        console.warn('[dsh-better-display] opening the folder pane failed:', error);
        return false;
    }
}
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-better-display-client';
export const inject = ['slots', 'sessions', 'conversation', 'remote', 'remote.session', 'remote.workspaceFiles'];
export function apply(ctx) {
    const store = createReaderStore();
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
            inject: (sessionId) => {
                const session = () => {
                    const current = ctx.sessions.binding(sessionId)?.session;
                    if (!current)
                        throw new Error('阅读页对应的会话已关闭。');
                    return current;
                };
                return {
                    openPrefs: prefs,
                    probeRevealDesktop: () => probeRevealDesktop(ctx),
                    fnosFileManagerTemplate: () => fnosTemplateOf(prefs),
                    revealPaneAvailable: () => typeof sidebarRightOf(ctx)?.openResource === 'function',
                    loadOlder: async () => { await session().loadOlder(); },
                    loadImage: async (attachment) => {
                        const receipt = await session().readAttachment(attachment.attachmentId);
                        if (!receipt.ok)
                            throw new Error(receipt.error.message);
                        return { data: Uint8Array.from(receipt.value.data), mediaType: receipt.value.attachment.mediaType };
                    },
                    openFile: async (path) => {
                        try {
                            const cwd = ctx.sessions?.list?.getSnapshot?.()?.byId[sessionId]?.cwd;
                            const sidebar = (ctx.get?.('sidebarRight')
                                ?? ctx.sidebarRight);
                            await openDeliverableFile({
                                path,
                                mode: modeFromSnapshot(prefs),
                                sessionId,
                                cwd,
                                resolveWorkspacePath,
                                openExternal: async (absolutePath) => { await openWorkspacePath(ctx, absolutePath); },
                                openSidebar: typeof sidebar?.openResource === 'function'
                                    ? (address) => { sidebar.openResource(address); }
                                    : undefined,
                                fileAddressFor: officialFileAddressFor ?? fileAddressFor,
                                warn: (message, extra) => { console.warn(message, extra); },
                            });
                        }
                        catch (error) {
                            console.warn('[dsh-better-display] openFile error:', error);
                        }
                    },
                    revealFile: async (path) => {
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
                            if (plan.kind === 'fnos' && openInNewTab(plan.url))
                                return 'fnos';
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
                                if (await openWorkspacePath(ctx, targetPath, folderTarget ? undefined : 'reveal'))
                                    return 'external';
                            }
                            if (plan.kind === 'sidebar' && openFolderPane(ctx, folder))
                                return 'sidebar';
                            return await copyToClipboard(folder) ? 'copied' : 'failed';
                        }
                        catch (error) {
                            console.warn('[dsh-better-display] revealFile error:', error);
                            return 'failed';
                        }
                    },
                    forkAt: (seq) => {
                        // A missing anchor would silently fork the whole session instead of
                        // the intended turn prefix, so refuse it loudly rather than guessing.
                        if (typeof seq !== 'number' || !Number.isFinite(seq)) {
                            console.warn('[dsh-better-display] fork refused: missing anchor seq');
                            return;
                        }
                        try {
                            const sessionsApi = ctx.sessions;
                            if (sessionsApi?.fork) {
                                sessionsApi.fork({ sessionId, atSeq: seq, increaseTitle: true })
                                    .then(childId => { sessionsApi.open?.(childId); })
                                    .catch(err => { console.warn('[dsh-better-display] fork failed:', err); });
                            }
                        }
                        catch (error) {
                            console.warn('[dsh-better-display] forkAt error:', error);
                        }
                    },
                    loadThrough: async (seq) => {
                        try {
                            const current = session();
                            if (typeof current?.loadThrough === 'function') {
                                await current.loadThrough(seq);
                            }
                            else {
                                await session().loadOlder();
                            }
                        }
                        catch (error) {
                            console.warn('[dsh-better-display] loadThrough error:', error);
                        }
                    },
                    fillComposer: (text) => {
                        // Sanctioned path: the conversation input shell owns the Lexical
                        // editor, so setDraft lands in the draft store deterministically.
                        try {
                            const conversation = ctx.conversation;
                            const shell = conversation?.input?.shell?.(sessionId);
                            if (shell && typeof shell.setDraft === 'function') {
                                shell.setDraft(text);
                                return true;
                            }
                        }
                        catch {
                            // Fall through to the DOM path below.
                        }
                        try {
                            return fillComposerDom(text);
                        }
                        catch {
                            return false;
                        }
                    },
                    getToolView: (toolName) => {
                        try {
                            const slotsService = ctx.slots;
                            const entries = slotsService?.entriesOfSlot?.('tool.call.toolview') ?? [];
                            const matches = entries.filter((e) => {
                                const key = e?.options?.key ?? e?.key;
                                const comp = e?.component ?? e?.view ?? e?.render ?? (typeof e === 'function' ? e : null);
                                return key === toolName && typeof comp === 'function';
                            });
                            if (matches.length === 0)
                                return null;
                            matches.sort((a, b) => {
                                const prioA = a?.options?.priority ?? a?.priority ?? 0;
                                const prioB = b?.options?.priority ?? b?.priority ?? 0;
                                return prioA - prioB;
                            });
                            const best = matches[0];
                            const prio = best?.options?.priority ?? best?.priority ?? 0;
                            const comp = best?.component ?? best?.view ?? best?.render ?? (typeof best === 'function' ? best : null);
                            if (prio < 0 || (toolName !== 'edit' && toolName !== 'write')) {
                                return comp;
                            }
                            return null;
                        }
                        catch {
                            return null;
                        }
                    },
                };
            },
        }, Reader);
        yield installReaderEntry(ctx);
    });
}
//# sourceMappingURL=index.js.map