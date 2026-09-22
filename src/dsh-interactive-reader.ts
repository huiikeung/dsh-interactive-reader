import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { scanGenerativeMcpappsStatus } from './skill-roots.js';
import { skillsFromListResult, toPublicSkillStatus } from './skill-status.js';

declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer?: {
      register: (route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
      }) => () => void;
    };
  }
}

export const name = 'dsh-interactive-reader';
export const inject = ['webServer'];

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function skillLister(ctx: Context): (() => Promise<readonly { readonly name?: string }[] | undefined>) | undefined {
  const skills = ctx.get?.('skills') as { list?: (options?: object) => Promise<unknown> } | undefined;
  if (typeof skills?.list !== 'function') return undefined;
  return async () => skillsFromListResult(await skills.list!({}));
}

export function apply(ctx: Context): void {
  console.log('[my-plugins/dsh-interactive-reader] loaded');

  if (ctx.webServer) {
    ctx.effect(() => {
      const disposeSkill = ctx.webServer!.register({
        kind: 'exact',
        path: '/interactive-reader/skill-status',
        handler: async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end();
            return;
          }
          try {
            const url = new URL(req.url ?? '', 'http://127.0.0.1');
            const cwd = url.searchParams.get('cwd') ?? undefined;
            const status = await scanGenerativeMcpappsStatus({
              cwd,
              listSkills: skillLister(ctx),
            });
            writeJson(res, 200, toPublicSkillStatus(status));
          } catch (err) {
            writeJson(res, 500, { ok: false, error: String(err) });
          }
        },
      });
      return () => {
        disposeSkill();
      };
    }, 'dsh-interactive-reader: skill-status route');
  }
}
