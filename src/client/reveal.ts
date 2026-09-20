import { basename, dirname } from './deliverables.js';

/**
 * "Show this file in its folder", across macOS, Windows and a headless NAS.
 *
 * Three targets, resolved in this order:
 *
 * 1. **A configured fnOS file-manager URL template**, when the folder lives in the
 *    NAS's canonical `/vol{n}/…` space. On a headless NAS this is the only target
 *    that reaches a real file manager, because the Host has no desktop at all.
 * 2. **The Host's native opener**, through the official Session remote
 *    (`session.openWorkspacePath` with `action: 'reveal'`): Finder selects the file
 *    on macOS, Explorer selects it on Windows, and the parent directory opens in the
 *    platform file manager on desktop Linux.
 * 3. **Copying the absolute folder path**, which always works and never claims a
 *    success the Host cannot deliver.
 *
 * The Host's own answer for (2) comes from the official `GET /api/present.host`
 * route (`sessionController.workspaceDesktop()`), so a headless Host reports
 * `available: false` instead of offering a button that spawns `xdg-open` into
 * nothing — which is what an unguarded `xdg-open` did here before.
 */

/** The platform file-manager action a Host can report. `null` means unsupported. */
export type RevealFileManager = 'finder' | 'explorer' | 'directory' | null;

/** What the Host said it can do with a produced path. */
export interface RevealDesktop {
  /** Host machine name, used in the tooltip when known. */
  name?: string;
  /** True only when the Host has a desktop that can actually take the path. */
  available: boolean;
  /** The file-manager action the Host performs for `reveal`. */
  fileManager: RevealFileManager;
}

/**
 * Used before the Host answers, and whenever no answer can be obtained. It keeps the
 * same shape as a parsed answer so callers can compare whole values.
 */
export const UNKNOWN_DESKTOP: RevealDesktop = { name: undefined, available: false, fileManager: null };

/** Result of a reveal attempt, so the chip can report what really happened. */
export type RevealOutcome = 'external' | 'fnos' | 'sidebar' | 'copied' | 'failed';

const FILE_MANAGERS: readonly RevealFileManager[] = ['finder', 'explorer', 'directory', null];

/**
 * Read the official `workspaceDesktop()` payload into a desktop description.
 *
 * The route answers `{ name, available, fileManager }`; anything malformed degrades
 * to {@link UNKNOWN_DESKTOP} rather than to a promise the Host cannot keep.
 */
export function desktopFromHost(payload: unknown): RevealDesktop {
  if (typeof payload !== 'object' || payload === null) return UNKNOWN_DESKTOP;
  const record = payload as { name?: unknown; available?: unknown; fileManager?: unknown };
  const fileManager = FILE_MANAGERS.includes(record.fileManager as RevealFileManager)
    ? record.fileManager as RevealFileManager
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
export function fnosPathOf(absolutePath: string): string | null {
  const normalized = absolutePath.replace(/\\/g, '/').replace(/\/+$/, '');
  return /^\/vol\d+(\/|$)/.test(normalized) ? normalized : null;
}

/** Placeholders a configured fnOS template may use. */
export const FNOS_TEMPLATE_TOKENS = ['{path}', '{encodedPath}', '{name}'] as const;

/**
 * Fill a fnOS file-manager URL template.
 *
 * `{path}` inserts the folder path raw, `{encodedPath}` percent-encodes it (what a
 * query parameter needs), and `{name}` inserts the folder's own name. A template
 * without a path placeholder cannot point anywhere, so it is refused instead of
 * opening the file manager's home screen and calling that a success.
 */
export function expandFnosTemplate(template: string, target: { path: string; name: string }): string | null {
  const trimmed = template.trim();
  if (trimmed === '') return null;
  if (!trimmed.includes('{path}') && !trimmed.includes('{encodedPath}')) return null;
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
export function fnosRevealUrl(folderPath: string, template: string): string | null {
  const managed = fnosPathOf(folderPath);
  if (managed === null) return null;
  return expandFnosTemplate(template, { path: managed, name: basename(managed) });
}

/** Where a reveal is about to go. */
export type RevealPlan =
  | { kind: 'fnos'; url: string; label: string }
  | { kind: 'native'; label: string }
  | { kind: 'sidebar'; label: string }
  | { kind: 'probe'; label: string }
  | { kind: 'copy'; label: string };

/** The folder to show for a produced-file path. */
export function revealFolderOf(target: string): string {
  return dirname(target);
}

/** Platform-correct, non-Apple-specific wording for the file-manager action. */
export function fileManagerName(fileManager: RevealFileManager): string {
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
 * headless NAS can honour. `desktop` may be omitted, which yields
 * {@link RevealPlan} `probe` so the caller can ask the Host and re-plan. When the
 * Host has no desktop, `paneAvailable` selects the plugin's own right-sidebar folder
 * pane — the last target that still shows something on a headless Host.
 */
export function revealPlanFor(args: {
  folderPath: string;
  template: string;
  desktop?: RevealDesktop;
  paneAvailable?: boolean;
}): RevealPlan {
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
  if (args.paneAvailable) {
    return { kind: 'sidebar', label: `在右侧栏打开所在目录 (${args.folderPath})` };
  }
  return { kind: 'copy', label: `复制所在目录路径（${args.desktop.name ?? '宿主'}没有桌面环境）` };
}
