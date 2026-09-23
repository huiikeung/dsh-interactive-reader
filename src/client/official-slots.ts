import { createElement, memo, useMemo, type ComponentType, type ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { SlotEntryDef, SlotMap, SlotSpec, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
import type { ToolCallBlock, MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { OpenFileOptions } from '@deepseek-ai/dsh-client-ui-chat/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';

/**
 * Composition adapter for the Host's own renderers.
 *
 * A component may render only the slots its own registration declares in `children`,
 * `renderSlot` throws `SlotOwnershipError` otherwise, and a slot may be declared
 * exactly once — every slot here is already declared by the host, so re-declaring it
 * throws `slot "..." is already declared`. The platform therefore gives a plugin no
 * way to render another owner's slot, and the only sanctioned route is to lend that
 * slot's contributions a seat of our own.
 *
 * Only public registry operations are used: `spec`, `entriesOfSlot`, `subscribe`,
 * `inject`, `register`. Original entries, declarations and components are never
 * modified, no official source is imported privately, and no official renderer is
 * reimplemented — the platform still binds injection, hooks, locale, stores and
 * boundaries, and re-runs each entry's `inject(sessionId)` against the session being
 * read.
 *
 * Child seats are uniquely named because a sub-slot has exactly one declarer, and a
 * second declarer of the same key throws at load. The thin component wrapper below
 * translates an entry's declared child names before delegating to the framework's own
 * `renderSlot`; it does not implement a slot renderer.
 */

/** Host-declared slots this reader borrows, and the Reader-owned seats it renders them in. */
const FAMILIES = {
  actions: 'conversation.chat.assistant-actions',
  tools: 'tool.call.toolview',
  tail: 'conversation.chat.turnTail',
  nodes: 'conversation.chat.node',
} as const;
export type OfficialFamily = keyof typeof FAMILIES;
export const OFFICIAL_SEATS = {
  actions: 'dsh-interactive-reader.official.actions/conversation.chat.assistant-actions',
  tools: 'dsh-interactive-reader.official.tools/tool.call.toolview',
  tail: 'dsh-interactive-reader.official.tail/conversation.chat.turnTail',
  nodes: 'dsh-interactive-reader.official.nodes/conversation.chat.node',
} as const;
export type OfficialSeat = typeof OFFICIAL_SEATS[OfficialFamily];
/** Seat name for the mirrored copies of `source`'s contributions. */
export const officialSeat = (family: OfficialFamily, source: string = FAMILIES[family]) =>
  `dsh-interactive-reader.official.${family}/${source}`;

/**
 * The official `tool.call.toolview` owner share, mirrored structurally.
 *
 * `@deepseek-ai/dsh-client-ui-tool` is deliberately not a dependency: it carries the
 * whole tool-UI layer, and a profile that installs no tool view should not be made to
 * depend on it. Every type it needs is re-exported by packages we already depend on,
 * so this mirror keeps the render site type-checked — passing a wrong owner prop is
 * the real risk here, and this keeps it a compile error. If the official owner ever
 * grows a field, this is where it must be added.
 *
 * The rest of a tool view's props (`useSessions`, `useSession`, the standard session
 * seats) come from `PropsRuntime` and are supplied by the platform, not by us — which
 * is precisely why rendering a view component by hand crashed: it was handed four
 * props and asked for `useSessions`.
 */
export interface OfficialToolOwner {
  callId: string;
  toolName: string;
  block: ToolCallBlock;
  cwd?: string | undefined;
  home?: string | undefined;
  openFile: (path: string, options?: OpenFileOptions) => void;
  loadImage: MessageImageLoader;
  inspect?: (() => void) | undefined;
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'dsh-interactive-reader.official.actions/conversation.chat.assistant-actions': SlotMap['conversation.chat.assistant-actions'];
    'dsh-interactive-reader.official.tools/tool.call.toolview': SlotEntryDef & { kind: 'keyed'; scope: 'session'; owner: OfficialToolOwner };
    'dsh-interactive-reader.official.tail/conversation.chat.turnTail': SlotMap['conversation.chat.turnTail'];
    'dsh-interactive-reader.official.nodes/conversation.chat.node': SlotMap['conversation.chat.node'];
  }
}

/**
 * Fallback spec, used only where the running Host does not declare the source.
 *
 * The live spec always wins: a future Host may legitimately change a kind — RC2
 * declared `conversation.chat.turnTail` as a chain while 0.1.6 declares it as a list,
 * so an expectation coded here would break on an upgrade for no reason.
 */
const FALLBACK: Record<OfficialFamily, SlotSpec<SlotEntryDef>> = {
  actions: { kind: 'list', scope: 'session' },
  tools: { kind: 'keyed', scope: 'session' },
  // 0.1.6-alpha.2 declares turnTail a list; RC2 declared it a chain, so the live spec
  // is the only thing that can be trusted here.
  tail: { kind: 'list', scope: 'session' },
  nodes: { kind: 'keyed', scope: 'session' },
};

/**
 * Node kinds this reader already presents itself. Everything else reaches the official
 * renderer through the nodes seat, which is what makes a node kind this fork has never
 * heard of render natively instead of as a raw record.
 */
export const READER_NODES: ReadonlySet<string> = new Set([
  'user', 'steering', 'assistant-step', 'tool-call', 'turn-tail', 'turn-process',
  'command', 'manual-compaction', 'compaction', 'context', 'system-prompt',
  'turn-error', 'turn-max-tokens', 'model-retry',
]);

/** The documented, type-erased registry inspection/registration boundary. */
export interface CompositionRegistry {
  spec(key: string): SlotSpec<SlotEntryDef> | undefined;
  entriesOfSlot(key: string): readonly StoredEntry[];
  subscribe(key: string, listener: () => void): () => void;
  inject(key: string, effect: () => () => void): () => void;
  register(options: Record<string, unknown>, component: unknown): () => void;
}

/**
 * The `children` table for our `conversation.view` registration: one seat per family
 * we render, carrying the live spec of the slot it mirrors.
 */
export function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): { [K in OfficialSeat]: SlotSpec<SlotMap[K]> } {
  return Object.fromEntries(Object.keys(FAMILIES).map(name => {
    const family = name as OfficialFamily;
    return [officialSeat(family), slots.spec(FAMILIES[family]) ?? FALLBACK[family]];
  })) as { [K in OfficialSeat]: SlotSpec<SlotMap[K]> };
}

type Render = (key: string, owner: object, options?: object) => ReactNode;
type RenderProps = { renderSlot: Render; renderSlotChain?: Render } & Record<string, unknown>;

/** Translate an entry's declared child-slot names onto our seats, then delegate. */
function translatedComponent(entry: StoredEntry, names: ReadonlyMap<string, string>) {
  if (names.size === 0) return entry.component;
  const Original = entry.component as ComponentType<Record<string, unknown>>;
  return memo(function OfficialSlotChildren(props: RenderProps) {
    const renders = useMemo(() => {
      const translate = (render: Render | undefined): Render => (key, owner, options) => {
        const seat = names.get(key);
        if (!seat || !render) throw new Error(`Undeclared official child slot: ${key}`);
        return render(seat, owner, options);
      };
      return {
        renderSlot: translate(props.renderSlot),
        ...(props.renderSlotChain ? { renderSlotChain: translate(props.renderSlotChain) } : {}),
      };
    }, [props.renderSlot, props.renderSlotChain]);
    return createElement(Original, { ...props, ...renders });
  });
}

/**
 * Keep the official produced-file cards from repeating paths this fork already shows.
 *
 * Reader's own chip row presents produced paths with its copy / reveal / open-mode
 * actions, and the official tail independently renders official file cards for explicit
 * `present` artifacts. Both read the same session data, so without this the same path
 * appears twice in one turn. Only the presentation prop is filtered: the source match,
 * the session data and the official component are untouched, and an unrecognized shape
 * passes through intact for safe forward degradation.
 */
export function producedPathTailMatch(value: unknown, displayedPaths?: readonly string[]): unknown {
  if (!value || typeof value !== 'object') return value;
  const match = value as Record<string, unknown>;
  const displayed = new Set(displayedPaths ?? []);
  return displayed.size > 0 && Array.isArray(match.produced) && Array.isArray(match.presented)
    ? { ...match, produced: match.produced.filter(path => !displayed.has(path as string)) }
    : value;
}

/** Wrap a tail contribution so its `matched` prop carries the filtered produced set. */
function tailPresentation(component: unknown) {
  const Original = component as ComponentType<Record<string, unknown>>;
  return memo(function ReaderTailPresentation(props: Record<string, unknown>) {
    const matched = useMemo(
      () => producedPathTailMatch(props.matched, props.readerProducedPaths as readonly string[] | undefined),
      [props.matched, props.readerProducedPaths],
    );
    return createElement(Original, { ...props, matched });
  });
}

/**
 * Mirror one slot's contribution set incrementally.
 *
 * Unrelated additions do not remount existing entries or recreate their subscriptions;
 * a source unload / HMR disposes the corresponding subtree and its closures before a
 * replacement. Child slots are mirrored recursively under namespaced seats, which is
 * what lets a contribution that declares children keep rendering them.
 */
export function mirrorOfficialSlot(
  slots: CompositionRegistry,
  source: string,
  target: string,
  namespace: string,
  accept: (entry: StoredEntry) => boolean = () => true,
): () => void {
  const mounted = new Map<StoredEntry, () => void>();
  let stopped = false;
  const reconcile = () => {
    if (stopped) return;
    const entries = slots.entriesOfSlot(source).filter(accept);
    const wanted = new Set(entries);
    for (const [entry, dispose] of mounted) {
      if (wanted.has(entry)) continue;
      dispose();
      mounted.delete(entry);
    }
    for (const entry of entries) {
      if (mounted.has(entry)) continue;
      const names = new Map(Object.keys(entry.children ?? {}).map(key => [key, `${namespace}/${key}`]));
      const children = Object.fromEntries([...names].map(([key, seat]) => [seat, entry.children![key]]));
      const disposers: (() => void)[] = [];
      const dispose = () => { for (const stop of disposers.splice(0).reverse()) stop(); };
      try {
        const { component: _component, options, children: _children, ...metadata } = entry;
        const presentation = source === FAMILIES.tail && entry.locale === 'deliverables'
          ? { ...entry, component: tailPresentation(entry.component) }
          : entry;
        disposers.push(slots.register({
          ...options, ...metadata, name: target,
          ...(names.size ? { children } : {}),
          registrant: `dsh-interactive-reader → ${entry.registrant ?? source}`,
        }, translatedComponent(presentation, names)));
        for (const [key, seat] of names) {
          disposers.push(mirrorOfficialSlot(slots, key, seat, namespace));
        }
        mounted.set(entry, dispose);
      } catch (error) {
        dispose();
        throw error;
      }
    }
  };
  const unsubscribe = slots.subscribe(source, reconcile);
  const dispose = () => {
    stopped = true;
    unsubscribe();
    for (const stop of [...mounted.values()].reverse()) stop();
    mounted.clear();
  };
  try { reconcile(); } catch (error) { dispose(); throw error; }
  return dispose;
}

/**
 * Run every mirror for as long as its source is live. Called from inside our
 * `conversation.view` registration — *after* it, because a slot may only be registered
 * into by an entry whose parent declared it, and running this earlier fails with
 * "a parent entry's children table must declare it".
 *
 * One family failing must not take the reading tab down with it, so each is isolated
 * and the reason is named.
 */
export function installOfficialSlots(ctx: Context): () => void {
  const slots = ctx.slots as unknown as CompositionRegistry;
  const disposers: (() => void)[] = [];
  for (const name of Object.keys(FAMILIES)) {
    const family = name as OfficialFamily;
    const source = FAMILIES[family];
    try {
      disposers.push(slots.inject(source, () => {
        const live = slots.spec(source) ?? FALLBACK[family];
        const declared = slots.spec(officialSeat(family));
        if (declared && (declared.kind !== live.kind || declared.scope !== live.scope)) {
          throw new Error(`Official slot contract changed: ${source}`);
        }
        // Tool views: mirror all of them — rendering their components by hand is what
        // crashed on `useSessions`. Node kinds: mirror only the ones this reader does
        // not present itself, or the same node would render twice.
        return mirrorOfficialSlot(slots, source, officialSeat(family), `dsh-interactive-reader.official.${family}`,
          family === 'nodes' ? entry => !READER_NODES.has(entry.options.key ?? '') : undefined);
      }));
    } catch (error) {
      console.warn(`[dsh-interactive-reader] could not lend the official ${family} slot a seat`, error);
    }
  }
  return () => { for (const stop of disposers.splice(0).reverse()) stop(); };
}
