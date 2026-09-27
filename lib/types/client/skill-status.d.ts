import { CONVENTIONAL_SKILL_ROOTS, GENERATIVE_MCPAPPS_SKILL, SKILL_PACK_RELATIVE, publicSkillRoots, skillListIncludes, skillsFromListResult, toPublicSkillStatus, type HostSkillStatus } from '../skill-status.js';
export { CONVENTIONAL_SKILL_ROOTS, GENERATIVE_MCPAPPS_SKILL, SKILL_PACK_RELATIVE, publicSkillRoots, skillListIncludes, skillsFromListResult, toPublicSkillStatus, };
export type { HostSkillStatus };
export interface SkillStatusSnapshot {
    readonly name: typeof GENERATIVE_MCPAPPS_SKILL;
    readonly installed: boolean;
    readonly via: 'skills.list' | 'skill-root' | null;
    readonly roots: HostSkillStatus['roots'];
    readonly packPath?: string;
    readonly hostReached: boolean;
}
export interface SkillStatusProbe {
    listRemoteSkills?: () => Promise<readonly {
        readonly name?: string;
    }[] | undefined>;
    fetchHostStatus?: () => Promise<HostSkillStatus | undefined>;
}
export declare function detectGenerativeMcpappsSkill(probe: SkillStatusProbe): Promise<SkillStatusSnapshot>;
/** mkdir/cp using conventional relative roots only. Host paths are ignored. */
export declare function shortestInstallCommand(_status?: Pick<SkillStatusSnapshot, 'packPath' | 'roots'>): string;
/** Host route the plugin's own Host half registers for this question. */
export declare const SKILL_STATUS_ROUTE = "/interactive-reader/skill-status";
/**
 * A probe that asks the plugin's own Host route and needs nothing from the Context.
 *
 * The Context-based probe is preferred because it can scope the scan to the reading
 * session's project root, but it also reaches through `ctx.sessions` from inside a
 * Settings slot — a coupling this section cannot check or repair. The conventional
 * user-level roots are session-independent, so the route answers the question on its
 * own; without this fallback, any failure in that one step shows "could not query the
 * host skill catalog" even while the Host answers the same question correctly.
 *
 * Never throws and never reports a non-answer as an answer: a failed request, a non-OK
 * status or a malformed body all read as "the Host did not answer".
 */
export declare function routeSkillProbe(request?: typeof fetch): SkillStatusProbe;
/**
 * Ask the Context probe first, then the route.
 *
 * A Context probe that answers decides the report, including a negative one — the
 * fallback is a safety net for a probe that cannot answer at all, not a second opinion
 * that may contradict a working one. It never turns a reachable Host into an
 * unreachable one, which is what the section's "could not query" state means.
 */
export declare function composeSkillProbe(primary: SkillStatusProbe | undefined, fallback: SkillStatusProbe): SkillStatusProbe;
/** First Session id of a Session-list snapshot, branded by the caller's snapshot type. */
export declare function firstSessionId<Id extends string>(list: {
    ids?: readonly Id[];
    byId?: Record<string, unknown>;
} | undefined): Id | undefined;
//# sourceMappingURL=skill-status.d.ts.map