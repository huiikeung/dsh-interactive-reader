import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
// See `types.ts`: namespace imports keep these packages' slot augmentations in
// the program, where `import type {}` would drop them.
import type * as DshChat from '@deepseek-ai/dsh-client-ui-chat/client';
import type * as DshConversation from '@deepseek-ai/dsh-client-ui-conversation/client';
import type * as DshRenderer from '@deepseek-ai/dsh-client-ui-renderer/client';
import type * as DshSession from '@deepseek-ai/dsh-client-ui-session/client';
import { resolveWorkspacePath } from '@deepseek-ai/dsh-util-workspace-path';
import { dirname } from './deliverables.js';
import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { fillComposerDom } from './mcp-app.js';
import { installReaderEntry } from './entry.js';
import type { ReaderInjected } from './types.js';

/** References the augmentation carriers; type-only, so it emits no code. */
export type ReaderClientCarriers = typeof DshChat | typeof DshConversation | typeof DshRenderer | typeof DshSession;

/** Structural face of the sanctioned per-session composer writer. */
interface ComposerShell {
  setDraft: (text: string) => void;
}
interface ConversationFace {
  input?: { shell?: (id: SessionId) => ComposerShell };
}

export type { ReaderBlockOwner } from './types.js';
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-better-display-client';
export const inject = ['slots', 'sessions', 'conversation', 'remote', 'remote.session'];

export function apply(ctx: Context): void {
  const store = createReaderStore();
  const faces = new Map<SessionId, ReaderInjected>();
  ctx.effect(() => () => { faces.clear(); });
  ctx.slots.inject('conversation.view', function* () {
    yield ctx.slots.register({
    name: 'conversation.view',
    id: 'reader',
    order: -5,
    label: () => '阅读',
    locale: 'chat',
    children: { 'dsh-better-display.block': { kind: 'chain', scope: 'session' } },
    store,
    // The Host hands the slot's inject face a plain session id string; the
    // branded `SessionId` is what `ctx.sessions` addresses bindings by.
    inject: (rawSessionId: string): ReaderInjected => {
      const sessionId = rawSessionId as SessionId;
      const session = () => {
        const current = ctx.sessions.binding(sessionId)?.session;
        if (!current) throw new Error('阅读页对应的会话已关闭。');
        return current;
      };
      const face: ReaderInjected = {
        loadOlder: async () => { await session().loadOlder(); },
        loadImage: async attachment => {
          const receipt = await session().readAttachment(attachment.attachmentId);
          if (!receipt.ok) throw new Error(receipt.error.message);
          return { data: Uint8Array.from(receipt.value.data), mediaType: receipt.value.attachment.mediaType };
        },
        openFile: async (path: string) => {
          try {
            const cwd = ctx.sessions?.list?.getSnapshot?.()?.byId[sessionId]?.cwd;
            const targetPath = path === '.' || path === '' ? (cwd ?? '.') : resolveWorkspacePath(cwd, path);
            const remote = ctx.remote as unknown as { session?: { openWorkspacePath: (arg: { path: string }) => Promise<{ ok: boolean; error?: { message: string } }> } } | undefined;
            const remoteSession = remote?.session
              ?? (ctx.get?.('remote.session') as unknown as { openWorkspacePath: (arg: { path: string }) => Promise<{ ok: boolean; error?: { message: string } }> } | undefined)
              ?? ((ctx.get?.('remote') as unknown as { session?: { openWorkspacePath: (arg: { path: string }) => Promise<{ ok: boolean; error?: { message: string } }> } })?.session);
            if (remoteSession?.openWorkspacePath) {
              const result = await remoteSession.openWorkspacePath({ path: targetPath });
              if (result?.ok) return;
            }
          } catch (error) {
            console.warn('[dsh-better-display] openFile error:', error);
          }
        },
        revealFile: async (path: string) => {
          try {
            const cwd = ctx.sessions?.list?.getSnapshot?.()?.byId[sessionId]?.cwd;
            const targetPath = resolveWorkspacePath(cwd, path);
            // 1. Try dedicated host endpoint for native file highlighting (open -R / explorer /select)
            try {
              const res = await fetch('/better-display/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: targetPath }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.ok) return;
              }
            } catch {
              // Server endpoint not yet available, fallback to directory open
            }

            // 2. Fallback to official opener with parent directory
            const parentDir = dirname(targetPath);
            const remote = ctx.remote as unknown as { session?: { openWorkspacePath: (arg: { path: string }) => Promise<{ ok: boolean; error?: { message: string } }> } } | undefined;
            const remoteSession = remote?.session
              ?? (ctx.get?.('remote.session') as unknown as { openWorkspacePath: (arg: { path: string }) => Promise<{ ok: boolean; error?: { message: string } }> } | undefined);
            if (remoteSession?.openWorkspacePath) {
              await remoteSession.openWorkspacePath({ path: parentDir });
            }
          } catch (error) {
            console.warn('[dsh-better-display] revealFile error:', error);
          }
        },
        forkAt: (seq: number) => {
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
      };
      faces.set(sessionId, face);
      return face;
    },
    }, Reader);
    yield installReaderEntry(ctx);
  });
}
