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
/**
 * Host route the plugin's own Host half registers for this question.
 *
 * Deliberately relative (no leading slash): the reading page can live under a path
 * prefix — the fnOS app gateway serves it from /app/deepseek-harness/fngateway/ — and
 * an absolute path would leave the prefix behind and 404 at the desktop's nginx.
 * Resolved against the document base, the same request works rooted and embedded.
 */
export declare const SKILL_STATUS_ROUTE = "interactive-reader/skill-status";
/**
 * How long one probe call may take before it reads as "no answer".
 *
 * The section disables its Re-check button while a check is in flight, so a probe that
 * never settles is a section that can never be checked again — which is exactly how it
 * looked in practice: the tag stuck on "Not detected", the button stuck on "Checking…".
 * Both probes here are local, so anything slower than this is not an answer on its way,
 * it is a call that will not come back.
 */
export declare const SKILL_PROBE_TIMEOUT_MS = 5000;
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
 * status, a malformed body and a request that never returns all read as "the Host did
 * not answer".
 */
export declare function routeSkillProbe(request?: typeof fetch, timeoutMs?: number): SkillStatusProbe;
/**
 * Ask the Context probe first, then the route.
 *
 * A Context probe that answers decides the report, including a negative one — the
 * fallback is a safety net for a probe that cannot answer at all, not a second opinion
 * that may contradict a working one. It never turns a reachable Host into an
 * unreachable one, which is what the section's "could not query" state means.
 *
 * Every call is bounded. The section's button is disabled while a check is in flight,
 * so an unbounded probe is a section that stops responding; a Context probe that hangs
 * now costs one timeout and then the route answers.
 */
export declare function composeSkillProbe(primary: SkillStatusProbe | undefined, fallback: SkillStatusProbe, timeoutMs?: number): SkillStatusProbe;
/** First Session id of a Session-list snapshot, branded by the caller's snapshot type. */
export declare function firstSessionId<Id extends string>(list: {
    ids?: readonly Id[];
    byId?: Record<string, unknown>;
} | undefined): Id | undefined;
//# sourceMappingURL=skill-status.d.ts.map