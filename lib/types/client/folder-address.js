import { basename } from './deliverables.js';
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
export const FOLDER_TAB_ID = 'dsh-better-display.folder';
export const FOLDER_TAB_KIND = 'better-display-folder';
/** The one scheme the shell's tab service accepts. */
export const FOLDER_ADDRESS_PREFIX = 'dsh-resource://better-display-folder/';
/** The address that opens one folder in this pane. */
export function folderAddressOf(absolutePath) {
    return FOLDER_ADDRESS_PREFIX + encodeURIComponent(absolutePath);
}
/** The folder an address points at, or `null` when it is not one of ours. */
export function folderPathOf(address) {
    if (typeof address !== 'string' || !address.startsWith(FOLDER_ADDRESS_PREFIX))
        return null;
    try {
        return decodeURIComponent(address.slice(FOLDER_ADDRESS_PREFIX.length));
    }
    catch {
        return null;
    }
}
/** Chip text for one folder address. */
export function folderTabTitle(address) {
    const path = folderPathOf(address);
    if (path === null || path === '')
        return '文件夹';
    return basename(path) || path;
}
/** Directories first, then names in a locale-aware order. */
export function sortFolderEntries(entries) {
    const rank = (entry) => (entry.type === 'directory' ? 0 : entry.type === 'file' ? 1 : 2);
    return [...entries].sort((left, right) => rank(left) - rank(right) || left.name.localeCompare(right.name, undefined, { numeric: true }));
}
/** Human-readable size, or an empty string when the backend reported none. */
export function formatEntrySize(size) {
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0)
        return '';
    if (size < 1024)
        return `${size} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
/** The parent folder to offer as "up", or `null` when there is nowhere above. */
export function parentFolderOf(path) {
    const normalized = path.replace(/[/\\]+$/, '');
    if (normalized === '' || normalized === '/')
        return null;
    const at = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    // A bare relative name has no parent, and one level under the root goes to the root —
    // `dirname` reports `.` there, which would lose `/vol1 → /`.
    if (at < 0)
        return null;
    if (at === 0)
        return '/';
    return normalized.slice(0, at);
}
/** The tab type the shell routes our addresses to. */
export const folderTabDefinition = {
    id: FOLDER_TAB_ID,
    kind: FOLDER_TAB_KIND,
    patterns: ['dsh-resource://better-display-folder/**'],
    // 'extension' is the band a type from outside the product gets, and it outranks the
    // shipped viewers; naming it keeps that explicit if the default ever changes.
    priority: 'extension',
    canOpen: (address) => folderPathOf(address) !== null,
    title: folderTabTitle,
};
//# sourceMappingURL=folder-address.js.map