import { basename, dirname } from './deliverables.js';
/**
 * Used before the Host answers, and whenever no answer can be obtained. It keeps the
 * same shape as a parsed answer so callers can compare whole values.
 */
export const UNKNOWN_DESKTOP = { name: undefined, available: false, fileManager: null };
const FILE_MANAGERS = ['finder', 'explorer', 'directory', null];
/**
 * Read the official `workspaceDesktop()` payload into a desktop description.
 *
 * The route answers `{ name, available, fileManager }`; anything malformed degrades
 * to {@link UNKNOWN_DESKTOP} rather than to a promise the Host cannot keep.
 */
export function desktopFromHost(payload) {
    if (typeof payload !== 'object' || payload === null)
        return UNKNOWN_DESKTOP;
    const record = payload;
    const fileManager = FILE_MANAGERS.includes(record.fileManager)
        ? record.fileManager
        : null;
    return {
        name: typeof record.name === 'string' && record.name.length > 0 ? record.name : undefined,
        available: record.available === true,
        fileManager,
    };
}
/**
 * The fnOS-spelled path, or `null` when the path is outside the NAS's file space.
 *
 * fnOS addresses shared storage as `/vol{n}/…` (volumes, not mounts), and its file
 * manager can only be pointed at those. A workspace elsewhere on the Host is
 * deliberately refused here so the fallback chain stays honest.
 */
export function fnosPathOf(absolutePath) {
    const normalized = absolutePath.replace(/\\/g, '/').replace(/\/+$/, '');
    return /^\/vol\d+(\/|$)/.test(normalized) ? normalized : null;
}
/** Placeholders a configured fnOS template may use. */
export const FNOS_TEMPLATE_TOKENS = ['{path}', '{encodedPath}', '{name}'];
/**
 * Fill a fnOS file-manager URL template.
 *
 * `{path}` inserts the folder path raw, `{encodedPath}` percent-encodes it (what a
 * query parameter needs), and `{name}` inserts the folder's own name. A template
 * without a path placeholder cannot point anywhere, so it is refused instead of
 * opening the file manager's home screen and calling that a success.
 */
export function expandFnosTemplate(template, target) {
    const trimmed = template.trim();
    if (trimmed === '')
        return null;
    if (!trimmed.includes('{path}') && !trimmed.includes('{encodedPath}'))
        return null;
    return trimmed
        .replaceAll('{encodedPath}', encodeURIComponent(target.path))
        .replaceAll('{path}', target.path)
        .replaceAll('{name}', encodeURIComponent(target.name));
}
/**
 * The fnOS file-manager URL for one folder, or `null` when this is not a fnOS
 * target. Kept separate from {@link revealPlanFor} so a caller can open it inside
 * the click that asked for it, before any `await` would cost the user gesture.
 */
export function fnosRevealUrl(folderPath, template) {
    const managed = fnosPathOf(folderPath);
    if (managed === null)
        return null;
    return expandFnosTemplate(template, { path: managed, name: basename(managed) });
}
/** The folder to show for a produced-file path. */
export function revealFolderOf(target) {
    return dirname(target);
}
/** Platform-correct, non-Apple-specific wording for the file-manager action. */
export function fileManagerName(fileManager) {
    switch (fileManager) {
        case 'finder': return '访达';
        case 'explorer': return '文件资源管理器';
        default: return '文件管理器';
    }
}
/**
 * Decide the target without performing it.
 *
 * The fnOS branch wins whenever a template maps, because it is the only target a
 * headless NAS can honour; `desktop` may be omitted, which yields {@link RevealPlan}
 * `probe` so the caller can ask the Host and re-plan.
 */
export function revealPlanFor(args) {
    const url = fnosRevealUrl(args.folderPath, args.template);
    if (url !== null) {
        return { kind: 'fnos', url, label: `在 fnOS 文件管理器中打开所在目录 (${args.folderPath})` };
    }
    if (args.desktop === undefined) {
        return { kind: 'probe', label: `在${fileManagerName(null)}中显示所在目录 (${args.folderPath})` };
    }
    if (args.desktop.available) {
        return { kind: 'native', label: `在${fileManagerName(args.desktop.fileManager)}中显示所在目录 (${args.folderPath})` };
    }
    return { kind: 'copy', label: `复制所在目录路径（${args.desktop.name ?? '宿主'}没有桌面环境）` };
}
//# sourceMappingURL=reveal.js.map