import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type {} from './settings-slots.js';
import { settingsCopyFor, zh, en } from './settings-copy.js';
import { SettingsSection, type BetterDisplaySettingsInjected, type OpenPrefs } from './SettingsSection.js';
import { firstSessionId, skillsFromListResult, type SkillStatusProbe } from './skill-status.js';
import type { HostSkillStatus } from '../skill-status.js';

interface LocaleFace {
  register?: (ns: string, dicts: { zh: unknown; en: unknown }) => () => void;
  bind?: (ns: string) => (key: string) => string;
  getSnapshot?: () => { locale?: string; language?: string };
}

/**
 * Structural face of the Session Controller's skill remote. The parameter is
 * the branded `SessionId` the controller sends, so this stays assignable from
 * the real `ClientRemote` instead of diverging from it.
 */
interface RemoteSkillsFace {
  list?: (request: { sessionId: SessionId }, signal?: AbortSignal) => Promise<unknown>;
}

function languageTag(ctx: Context): string | undefined {
  const locale = (ctx.get?.('locale') ?? (ctx as unknown as { locale?: LocaleFace }).locale) as LocaleFace | undefined;
  const snap = locale?.getSnapshot?.();
  return snap?.locale ?? snap?.language
    ?? (typeof document !== 'undefined' ? document.documentElement.lang : undefined)
    ?? (typeof navigator !== 'undefined' ? navigator.language : undefined);
}

function createSkillProbe(ctx: Context): SkillStatusProbe {
  return {
    fetchHostStatus: async () => {
      const snap = ctx.sessions.list.getSnapshot();
      const id = firstSessionId(snap);
      const cwd = id === undefined ? undefined : snap.byId[id]?.cwd;
      const url = cwd
        ? `/better-display/skill-status?cwd=${encodeURIComponent(cwd)}`
        : '/better-display/skill-status';
      const res = await fetch(url);
      if (!res.ok) return undefined;
      return await res.json() as HostSkillStatus;
    },
    listRemoteSkills: async () => {
      const remote = ctx.remote as unknown as { skills?: RemoteSkillsFace } | undefined;
      const skills = remote?.skills
        ?? (ctx.get?.('remote.skills') as RemoteSkillsFace | undefined)
        ?? ((ctx.get?.('remote') as unknown as { skills?: RemoteSkillsFace } | undefined)?.skills);
      const sessionId = firstSessionId(ctx.sessions.list.getSnapshot());
      if (!skills?.list || sessionId === undefined) return undefined;
      return skillsFromListResult(await skills.list({ sessionId }));
    },
  };
}

export function installBetterDisplaySettings(ctx: Context, prefs: OpenPrefs): void {
  const locale = (ctx.get?.('locale') ?? (ctx as unknown as { locale?: LocaleFace }).locale) as LocaleFace | undefined;
  if (locale?.register) {
    ctx.effect(() => locale.register!('better-display', { zh, en }), 'dsh-better-display: settings copy');
  }
  const checkSkill = createSkillProbe(ctx);
  const injected = (): BetterDisplaySettingsInjected => ({
    prefs,
    copy: settingsCopyFor(languageTag(ctx)),
    languageTag: languageTag(ctx),
    checkSkill,
  });
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'better-display',
    order: 40,
    label: () => locale?.bind?.('better-display')?.('nav') || settingsCopyFor(languageTag(ctx)).nav,
    locale: locale?.bind ? 'better-display' : undefined,
    inject: injected,
  }, SettingsSection));
}
