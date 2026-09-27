import {
  CONVENTIONAL_SKILL_ROOTS,
  GENERATIVE_MCPAPPS_SKILL,
  SKILL_PACK_RELATIVE,
  publicSkillRoots,
  skillListIncludes,
  skillsFromListResult,
  toPublicSkillStatus,
  type HostSkillStatus,
} from '../skill-status.js';

export {
  CONVENTIONAL_SKILL_ROOTS,
  GENERATIVE_MCPAPPS_SKILL,
  SKILL_PACK_RELATIVE,
  publicSkillRoots,
  skillListIncludes,
  skillsFromListResult,
  toPublicSkillStatus,
};
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
  listRemoteSkills?: () => Promise<readonly { readonly name?: string }[] | undefined>;
  fetchHostStatus?: () => Promise<HostSkillStatus | undefined>;
}

export async function detectGenerativeMcpappsSkill(probe: SkillStatusProbe): Promise<SkillStatusSnapshot> {
  let host: HostSkillStatus | undefined;
  if (probe.fetchHostStatus) {
    try {
      host = await probe.fetchHostStatus();
    } catch {
      host = undefined;
    }
  }

  let remoteHit = false;
  if (probe.listRemoteSkills) {
    try {
      remoteHit = skillListIncludes(await probe.listRemoteSkills());
    } catch {
      remoteHit = false;
    }
  }

  const installed = Boolean(host?.installed || remoteHit);
  const via = remoteHit ? 'skills.list' : (host?.via ?? null);
  const publicHost = host === undefined ? undefined : toPublicSkillStatus(host);
  return {
    name: GENERATIVE_MCPAPPS_SKILL,
    installed,
    via,
    roots: publicHost?.roots ?? publicSkillRoots(),
    hostReached: host !== undefined,
  };
}

/** mkdir/cp using conventional relative roots only. Host paths are ignored. */
export function shortestInstallCommand(_status?: Pick<SkillStatusSnapshot, 'packPath' | 'roots'>): string {
  const dest = CONVENTIONAL_SKILL_ROOTS[0];
  return `mkdir -p ${dest} && cp -R ${SKILL_PACK_RELATIVE} ${dest}/`;
}

/** Host route the plugin's own Host half registers for this question. */
export const SKILL_STATUS_ROUTE = '/interactive-reader/skill-status';

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
export function routeSkillProbe(request: typeof fetch = fetch): SkillStatusProbe {
  return {
    fetchHostStatus: async () => {
      if (typeof request !== 'function') return undefined;
      try {
        const res = await request(SKILL_STATUS_ROUTE);
        if (!res.ok) return undefined;
        return await res.json() as HostSkillStatus;
      } catch {
        return undefined;
      }
    },
  };
}

/**
 * Ask the Context probe first, then the route.
 *
 * A Context probe that answers decides the report, including a negative one — the
 * fallback is a safety net for a probe that cannot answer at all, not a second opinion
 * that may contradict a working one. It never turns a reachable Host into an
 * unreachable one, which is what the section's "could not query" state means.
 */
export function composeSkillProbe(primary: SkillStatusProbe | undefined, fallback: SkillStatusProbe): SkillStatusProbe {
  return {
    fetchHostStatus: async () => {
      if (primary?.fetchHostStatus) {
        try {
          const status = await primary.fetchHostStatus();
          if (status !== undefined) return status;
        } catch {
          // Fall through: the Context probe could not answer.
        }
      }
      return await fallback.fetchHostStatus?.();
    },
    listRemoteSkills: async () => {
      const listed = primary?.listRemoteSkills ? await primary.listRemoteSkills().catch(() => undefined) : undefined;
      return listed ?? await fallback.listRemoteSkills?.();
    },
  };
}

/** First Session id of a Session-list snapshot, branded by the caller's snapshot type. */
export function firstSessionId<Id extends string>(list: { ids?: readonly Id[]; byId?: Record<string, unknown> } | undefined): Id | undefined {
  if (list?.ids && list.ids.length > 0) return list.ids[0];
  const keys = list?.byId ? Object.keys(list.byId) : [];
  return keys[0] as Id | undefined;
}
