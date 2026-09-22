import { settingsCopyFor, zh, en } from './settings-copy.js';
import { SettingsSection } from './SettingsSection.js';
import { firstSessionId, skillsFromListResult } from './skill-status.js';
function languageTag(ctx) {
    const locale = (ctx.get?.('locale') ?? ctx.locale);
    const snap = locale?.getSnapshot?.();
    return snap?.locale ?? snap?.language
        ?? (typeof document !== 'undefined' ? document.documentElement.lang : undefined)
        ?? (typeof navigator !== 'undefined' ? navigator.language : undefined);
}
function createSkillProbe(ctx) {
    return {
        fetchHostStatus: async () => {
            const snap = ctx.sessions.list.getSnapshot();
            const id = firstSessionId(snap);
            const cwd = id === undefined ? undefined : snap.byId[id]?.cwd;
            const url = cwd
                ? `/interactive-reader/skill-status?cwd=${encodeURIComponent(cwd)}`
                : '/interactive-reader/skill-status';
            const res = await fetch(url);
            if (!res.ok)
                return undefined;
            return await res.json();
        },
        listRemoteSkills: async () => {
            const remote = ctx.remote;
            const skills = remote?.skills
                ?? ctx.get?.('remote.skills')
                ?? (ctx.get?.('remote')?.skills);
            const sessionId = firstSessionId(ctx.sessions.list.getSnapshot());
            if (!skills?.list || sessionId === undefined)
                return undefined;
            return skillsFromListResult(await skills.list({ sessionId }));
        },
    };
}
export function installBetterDisplaySettings(ctx, prefs) {
    const locale = (ctx.get?.('locale') ?? ctx.locale);
    if (locale?.register) {
        ctx.effect(() => locale.register('interactive-reader', { zh, en }), 'dsh-interactive-reader: settings copy');
    }
    const checkSkill = createSkillProbe(ctx);
    const injected = () => ({
        prefs,
        copy: settingsCopyFor(languageTag(ctx)),
        languageTag: languageTag(ctx),
        checkSkill,
    });
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'interactive-reader',
        order: 40,
        label: () => locale?.bind?.('interactive-reader')?.('nav') || settingsCopyFor(languageTag(ctx)).nav,
        locale: locale?.bind ? 'interactive-reader' : undefined,
        inject: injected,
    }, SettingsSection));
}
//# sourceMappingURL=settings.js.map