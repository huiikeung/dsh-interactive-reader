import { memo, useEffect, useState } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import { basename } from './deliverables.js';
import { fileAddressFor } from './open-file.js';
import {
  FOLDER_TAB_ID,
  folderPathOf,
  folderTabDefinition,
  formatEntrySize,
  parentFolderOf,
  sortFolderEntries,
  type FolderListing,
} from './folder-address.js';
import css from './FolderPane.module.css';

/**
 * The right-sidebar folder pane body and its registration.
 *
 * This exists because DSH cannot point its own files tree at a path: that type is a
 * builtin page — no `patterns`, no `canOpen`, so it is never an address candidate —
 * and its root is derived from the session (`start(tab.id, cwd)`), never from the open
 * call. So「在文件夹中显示」gets its own address-routed tab type instead.
 *
 * Two rules come from the shell and are easy to get wrong:
 *
 * - The address must live under `dsh-resource://`; `sidebarRight.placeResource`
 *   refuses every other scheme outright (see `folder-address.ts`).
 * - The body is registered under the slot `sidebar.right.pane.tab`, keyed by the
 *   definition's `id`, and it receives the address through the seat-injected
 *   `useTabInfo()` hook rather than as a prop.
 *
 * Content comes from the official `workspaceFiles.list` Remote, which keeps listings
 * workspace-scoped and capped, instead of a read route of our own.
 */

export { folderAddressOf, folderPathOf, folderTabDefinition, folderTabTitle } from './folder-address.js';

/** One directory read, bound to a session by the slot's inject face. */
export type FolderList = (path: string) => Promise<FolderListing>;

interface TabInfo {
  tab?: {
    navigation?: { address?: string; revision?: number };
    actions?: { openResource?: (address: string, options?: { params?: unknown }) => void };
  };
}

export interface FolderPaneProps {
  /** Injected by the seat, never passed as a prop. */
  useTabInfo?: () => TabInfo;
  sessionId?: string;
  list?: FolderList;
}

export const FolderPaneBody = memo(function FolderPaneBody({ useTabInfo, sessionId, list }: FolderPaneProps) {
  const info = useTabInfo?.();
  const address = info?.tab?.navigation?.address ?? '';
  const revision = info?.tab?.navigation?.revision ?? 0;
  const rootPath = folderPathOf(address);
  const openResource = info?.tab?.actions?.openResource;

  const [current, setCurrent] = useState(rootPath ?? '');
  // A new address on the same mounted tab re-roots the pane.
  useEffect(() => { setCurrent(rootPath ?? ''); }, [rootPath, revision]);

  const [listing, setListing] = useState<FolderListing | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (list === undefined || current === '') {
      setLoading(false);
      setError(current === '' ? '这个面板没有可显示的目录。' : undefined);
      setListing(undefined);
      return undefined;
    }
    let live = true;
    setLoading(true);
    setError(undefined);
    void list(current).then(
      next => { if (live) { setListing(next); setLoading(false); } },
      reason => { if (live) { setError(String(reason?.message ?? reason)); setListing(undefined); setLoading(false); } },
    );
    return () => { live = false; };
  }, [current, list]);

  const parent = parentFolderOf(current);
  const openFile = (name: string) => {
    if (openResource === undefined || sessionId === undefined) return;
    // The official session-scoped file address, so the shell's own preview opens it.
    openResource(fileAddressFor(sessionId, undefined, `${current.replace(/\/+$/, '')}/${name}`));
  };

  return (
    <div className={css.pane} data-interactive-reader-folder-pane data-folder={current}>
      <div className={css.header}>
        {parent !== null && (
          <button
            type="button"
            className={css.up}
            title={`上级目录 (${parent})`}
            aria-label="上级目录"
            onClick={() => setCurrent(parent)}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M10.5 3.5 6 8l4.5 4.5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <span className={css.path} title={current}>{basename(current) || current}</span>
      </div>

      {loading && <p className={css.note} role="status">正在读取目录…</p>}
      {!loading && error !== undefined && <p className={css.error} role="alert">无法读取目录：{error}</p>}
      {!loading && error === undefined && listing !== undefined && listing.entries.length === 0 && (
        <p className={css.note}>这个目录是空的。</p>
      )}

      {listing !== undefined && listing.entries.length > 0 && (
        <ul className={css.list}>
          {sortFolderEntries(listing.entries).map(entry => (
            <li key={`${entry.type}:${entry.name}`} className={css.item}>
              <button
                type="button"
                className={css.entry}
                data-kind={entry.type}
                title={entry.name}
                onClick={() => {
                  if (entry.type === 'directory') {
                    setCurrent(`${current.replace(/\/+$/, '')}/${entry.name}`);
                  } else if (entry.type === 'file') {
                    openFile(entry.name);
                  }
                }}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" aria-hidden="true">
                  {entry.type === 'directory'
                    ? <path d="M2 4.5h4l1.5 2H14v6.5H2V4.5z" strokeWidth="1.2" strokeLinejoin="round" />
                    : <><path d="M4 2.5h5l3 3V13.5H4V2.5z" strokeWidth="1.2" strokeLinejoin="round" /><path d="M9 2.5v3h3" strokeWidth="1.2" strokeLinejoin="round" /></>}
                </svg>
                <span className={css.name}>{entry.name}</span>
                {entry.type === 'file' && <span className={css.size}>{formatEntrySize(entry.size)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {listing?.truncated && <p className={css.note}>目录内容过多，仅显示前一部分。</p>}
    </div>
  );
});

/** Structural face of the shell's tab registry (a Cordis service). */
interface SidebarRightTabsFace {
  register?: (definition: typeof folderTabDefinition) => () => void;
}

/** Structural face of the official `workspaceFiles` Remote, listing only. */
interface WorkspaceFilesFace {
  list?: (sessionId: string, path: string, signal?: AbortSignal) => Promise<{
    ok: boolean;
    value?: FolderListing;
    error?: { message?: string };
  }>;
}

interface SlotsFace {
  inject: (name: string, callback: () => unknown) => unknown;
  register: (options: Record<string, unknown>, component: unknown) => unknown;
}

/** Both registrations hand back a disposer Cordis can run on unload. */
type Disposer = () => void;

/**
 * Register the pane's type and body.
 *
 * Every step is optional on purpose: a shell without the sidebar registry leaves the
 * reveal chain without a pane target, which degrades to copying the path rather than
 * failing the whole plugin to load.
 */
export function installFolderPane(ctx: Context): void {
  const tabs = ctx.get?.('sidebarRightTabs') as SidebarRightTabsFace | undefined;
  if (typeof tabs?.register !== 'function') return;
  // Resolved on each read rather than once: the bundle declares `remote.workspaceFiles`
  // as a dependency, but the namespace may land after this plugin's own install.
  const filesFace = (): WorkspaceFilesFace | undefined =>
    (ctx.remote as unknown as { workspaceFiles?: WorkspaceFilesFace } | undefined)?.workspaceFiles
    ?? (ctx.get?.('remote.workspaceFiles') as WorkspaceFilesFace | undefined)
    ?? ((ctx.get?.('remote') as unknown as { workspaceFiles?: WorkspaceFilesFace } | undefined)?.workspaceFiles);
  const slots = ctx.slots as unknown as SlotsFace;

  ctx.effect(() => tabs.register!(folderTabDefinition) as unknown as Disposer, 'dsh-interactive-reader: folder pane tab type');
  ctx.effect(() => slots.inject('sidebar.right.pane.tab', () => slots.register({
    name: 'sidebar.right.pane.tab',
    key: FOLDER_TAB_ID,
    inject: (sessionId: string) => ({
      list: async (path: string): Promise<FolderListing> => {
        const files = filesFace();
        if (typeof files?.list !== 'function') throw new Error('workspaceFiles.list is unavailable');
        const answer = await files.list(sessionId, path);
        if (!answer?.ok || answer.value === undefined) {
          throw new Error(answer?.error?.message ?? '目录读取失败');
        }
        return answer.value;
      },
    }),
  }, FolderPaneBody)) as unknown as Disposer, 'dsh-interactive-reader: folder pane body');
}
