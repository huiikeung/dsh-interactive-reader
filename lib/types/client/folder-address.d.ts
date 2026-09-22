/**
 * The address grammar and pure helpers for the right-sidebar folder pane.
 *
 * Kept free of React and CSS so the grammar is testable on its own; the pane body and
 * its registration live in `folder-pane.tsx`.
 *
 * The shell only routes `dsh-resource://` addresses (`sidebarRight.placeResource`
 * refuses every other scheme), so the pane owns a resource *type* under that scheme
 * rather than a scheme of its own.
 */
export declare const FOLDER_TAB_ID = "dsh-interactive-reader.folder";
export declare const FOLDER_TAB_KIND = "interactive-reader-folder";
/** The one scheme the shell's tab service accepts. */
export declare const FOLDER_ADDRESS_PREFIX = "dsh-resource://interactive-reader-folder/";
/** The address that opens one folder in this pane. */
export declare function folderAddressOf(absolutePath: string): string;
/** The folder an address points at, or `null` when it is not one of ours. */
export declare function folderPathOf(address: string): string | null;
/** Chip text for one folder address. */
export declare function folderTabTitle(address: string): string;
/** One child of a listed directory, as the official Remote reports it. */
export interface FolderEntry {
    name: string;
    type: 'file' | 'directory' | 'other';
    size?: number;
}
/** The official `workspaceFiles.list` answer. */
export interface FolderListing {
    path: string;
    entries: readonly FolderEntry[];
    truncated: boolean;
}
/** Directories first, then names in a locale-aware order. */
export declare function sortFolderEntries(entries: readonly FolderEntry[]): FolderEntry[];
/** Human-readable size, or an empty string when the backend reported none. */
export declare function formatEntrySize(size: number | undefined): string;
/** The parent folder to offer as "up", or `null` when there is nowhere above. */
export declare function parentFolderOf(path: string): string | null;
/** The tab type the shell routes our addresses to. */
export declare const folderTabDefinition: {
    id: string;
    kind: string;
    patterns: string[];
    priority: "extension";
    canOpen: (address: string) => boolean;
    title: typeof folderTabTitle;
};
//# sourceMappingURL=folder-address.d.ts.map