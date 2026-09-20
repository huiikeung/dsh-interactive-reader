import type { Context } from '@deepseek-ai/cordis';
import { type FolderListing } from './folder-address.js';
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
        navigation?: {
            address?: string;
            revision?: number;
        };
        actions?: {
            openResource?: (address: string, options?: {
                params?: unknown;
            }) => void;
        };
    };
}
export interface FolderPaneProps {
    /** Injected by the seat, never passed as a prop. */
    useTabInfo?: () => TabInfo;
    sessionId?: string;
    list?: FolderList;
}
export declare const FolderPaneBody: import("react").MemoExoticComponent<({ useTabInfo, sessionId, list }: FolderPaneProps) => import("react").JSX.Element>;
/**
 * Register the pane's type and body.
 *
 * Every step is optional on purpose: a shell without the sidebar registry leaves the
 * reveal chain without a pane target, which degrades to copying the path rather than
 * failing the whole plugin to load.
 */
export declare function installFolderPane(ctx: Context): void;
//# sourceMappingURL=folder-pane.d.ts.map