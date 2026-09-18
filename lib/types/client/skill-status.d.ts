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
/** First Session id of a Session-list snapshot, branded by the caller's snapshot type. */
export declare function firstSessionId<Id extends string>(list: {
    ids?: readonly Id[];
    byId?: Record<string, unknown>;
} | undefined): Id | undefined;
//# sourceMappingURL=skill-status.d.ts.map