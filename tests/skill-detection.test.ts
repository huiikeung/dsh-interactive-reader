import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSkillProbe, detectGenerativeMcpappsSkill, routeSkillProbe, SKILL_STATUS_ROUTE } from '../src/client/skill-status.ts';

/**
 * The Settings section's skill report is only as good as its probe.
 *
 * The Context-based probe reaches through `ctx.sessions` from inside a Settings slot; a
 * failure anywhere in that chain used to leave the section reporting "could not query
 * the host skill catalog" while the Host answered the same question correctly over its
 * own route. These cases pin the fallback: the direct route answers when the Context
 * probe cannot, a failed request never becomes an answer, and a working Context probe
 * still decides the report on its own.
 */

const HOST_STATUS = {
  name: 'generative-mcpapps' as const,
  installed: true,
  via: 'skill-root' as const,
  roots: [{ source: 'user-dsh' as const, path: '/host/skills' }],
};

/** Minimal Response stand-in: the probe only reads `ok` and `json()`. */
const answer = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;
const fetcher = (impl: () => Promise<Response>) => impl as unknown as typeof fetch;

test('the direct route probe reads the answer from the plugin\'s own route', async () => {
  const seen: string[] = [];
  const probe = routeSkillProbe(fetcher(async () => { seen.push('called'); return answer(HOST_STATUS); }));
  assert.deepEqual(await probe.fetchHostStatus!(), HOST_STATUS);
  assert.deepEqual(seen, ['called']);
  assert.equal(SKILL_STATUS_ROUTE, '/interactive-reader/skill-status');
});

test('a failed or non-OK request reads as no answer, never as an answer', async () => {
  const offline = routeSkillProbe(fetcher(async () => { throw new Error('offline'); }));
  assert.equal(await offline.fetchHostStatus!(), undefined);

  const notOk = routeSkillProbe(fetcher(async () => answer({}, false)));
  assert.equal(await notOk.fetchHostStatus!(), undefined);

  const unparsable = routeSkillProbe(fetcher(async () => ({
    ok: true,
    json: async () => { throw new Error('not json'); },
  }) as unknown as Response));
  assert.equal(await unparsable.fetchHostStatus!(), undefined);
});

test('a Context probe that cannot answer falls through to the route', async () => {
  const context = { fetchHostStatus: async () => { throw new Error('no sessions service'); } };
  const probe = composeSkillProbe(context, routeSkillProbe(fetcher(async () => answer(HOST_STATUS))));
  const status = await detectGenerativeMcpappsSkill(probe);
  assert.equal(status.installed, true);
  assert.equal(status.hostReached, true);
  assert.equal(status.via, 'skill-root');
});

test('a Context probe that answers decides, including a negative answer', async () => {
  let asked = false;
  const context = { fetchHostStatus: async () => ({ ...HOST_STATUS, installed: false, via: null }) };
  const probe = composeSkillProbe(context, routeSkillProbe(fetcher(async () => {
    asked = true;
    return answer(HOST_STATUS);
  })));
  const status = await detectGenerativeMcpappsSkill(probe);
  assert.equal(status.installed, false);
  assert.equal(status.hostReached, true);
  assert.equal(asked, false, 'the route is not asked when the Context probe answered');
});

test('a Context probe that answers nothing also falls through', async () => {
  const context = { fetchHostStatus: async () => undefined };
  const probe = composeSkillProbe(context, routeSkillProbe(fetcher(async () => answer(HOST_STATUS))));
  assert.equal((await detectGenerativeMcpappsSkill(probe)).installed, true);
});

test('detection survives a probe that cannot query anything at all', async () => {
  const status = await detectGenerativeMcpappsSkill({});
  assert.equal(status.installed, false);
  assert.equal(status.hostReached, false);
  assert.deepEqual(status.roots, [
    { source: 'conventional', path: '.dsh/skills' },
    { source: 'conventional', path: '.agents/skills' },
  ]);
});

test('a remote skills list still counts as installed when the Host route is silent', async () => {
  const probe = composeSkillProbe({
    fetchHostStatus: async () => undefined,
    listRemoteSkills: async () => [{ name: 'generative-mcpapps' }],
  }, routeSkillProbe(fetcher(async () => { throw new Error('offline'); })));
  const status = await detectGenerativeMcpappsSkill(probe);
  assert.equal(status.installed, true);
  assert.equal(status.via, 'skills.list');
});

/**
 * The section disables its Re-check button while a check is in flight. A probe that
 * never settles therefore used to leave the button stuck on "Checking…" and the tag on
 * "Not detected" forever — the failure this bounds.
 */
const never = () => new Promise<never>(() => {});

test('a request that never returns reads as no answer instead of hanging', async () => {
  const probe = routeSkillProbe(fetcher(() => never() as Promise<Response>), 20);
  const settled = await probe.fetchHostStatus!();
  assert.equal(settled, undefined);
});

test('a Context probe that never settles falls through to the route', async () => {
  const probe = composeSkillProbe(
    { fetchHostStatus: () => never() as Promise<never> },
    routeSkillProbe(fetcher(async () => answer(HOST_STATUS)), 20),
    20,
  );
  const status = await detectGenerativeMcpappsSkill(probe);
  assert.equal(status.installed, true);
  assert.equal(status.hostReached, true);
});

test('a remote skills call that never settles cannot stall the report either', async () => {
  const probe = composeSkillProbe({
    fetchHostStatus: () => never() as Promise<never>,
    listRemoteSkills: () => never() as Promise<never>,
  }, routeSkillProbe(fetcher(async () => answer(HOST_STATUS)), 20), 20);
  const status = await detectGenerativeMcpappsSkill(probe);
  assert.equal(status.installed, true);
  assert.equal(status.hostReached, true);
});
