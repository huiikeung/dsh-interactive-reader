import { settingsCopyFor, zh, en } from './settings-copy.js';
import { SettingsSection } from './SettingsSection.js';
import { composeSkillProbe, firstSessionId, routeSkillProbe, SKILL_STATUS_ROUTE, skillsFromListResult } from './skill-status.js';
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
            // SKILL_STATUS_ROUTE is relative so the request follows the document base — the
            // fnOS app gateway serves this page under /app/deepseek-harness/fngateway/.
            const url = cwd
                ? `${SKILL_STATUS_ROUTE}?cwd=${encodeURIComponent(cwd)}`
                : SKILL_STATUS_ROUTE;
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
    // The Context probe can scope the scan to this reading session's project root, so it
    // is asked first; the plugin's own route is the safety net for the case where that
    // probe cannot answer at all. See `composeSkillProbe`.
    const checkSkill = composeSkillProbe(createSkillProbe(ctx), routeSkillProbe());
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