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
export declare const UNKNOWN_DESKTOP: RevealDesktop;
/** Result of a reveal attempt, so the chip can report what really happened. */
export type RevealOutcome = 'external' | 'fnos' | 'sidebar' | 'copied' | 'failed';
/**
 * Read the official `workspaceDesktop()` payload into a desktop description.
 *
 * The route answers `{ name, available, fileManager }`; anything malformed degrades
 * to {@link UNKNOWN_DESKTOP} rather than to a promise the Host cannot keep.
 */
export declare function desktopFromHost(payload: unknown): RevealDesktop;
/**
 * The fnOS-spelled path, or `null` when the path is outside the NAS's file space.
 *
 * fnOS addresses shared storage as `/vol{n}/…` (volumes, not mounts), and its file
 * manager can only be pointed at those. A workspace elsewhere on the Host is
 * deliberately refused here so the fallback chain stays honest.
 */
export declare function fnosPathOf(absolutePath: string): string | null;
/** Placeholders a configured fnOS template may use. */
export declare const FNOS_TEMPLATE_TOKENS: readonly ["{path}", "{encodedPath}", "{name}"];
/**
 * Fill a fnOS file-manager URL template.
 *
 * `{path}` inserts the folder path raw, `{encodedPath}` percent-encodes it (what a
 * query parameter needs), and `{name}` inserts the folder's own name. A template
 * without a path placeholder cannot point anywhere, so it is refused instead of
 * opening the file manager's home screen and calling that a success.
 */
export declare function expandFnosTemplate(template: string, target: {
    path: string;
    name: string;
}): string | null;
/**
 * The fnOS file-manager URL for one folder, or `null` when this is not a fnOS
 * target. Kept separate from {@link revealPlanFor} so a caller can open it inside
 * the click that asked for it, before any `await` would cost the user gesture.
 */
export declare function fnosRevealUrl(folderPath: string, template: string): string | null;
/** Where a reveal is about to go. */
export type RevealPlan = {
    kind: 'fnos';
    url: string;
    label: string;
} | {
    kind: 'native';
    label: string;
} | {
    kind: 'sidebar';
    label: string;
} | {
    kind: 'probe';
    label: string;
} | {
    kind: 'copy';
    label: string;
};
/** The folder to show for a produced-file path. */
export declare function revealFolderOf(target: string): string;
/** Platform-correct, non-Apple-specific wording for the file-manager action. */
export declare function fileManagerName(fileManager: RevealFileManager): string;
/**
 * Decide the target without performing it.
 *
 * The fnOS branch wins whenever a template maps, because it is the only target a
 * headless NAS can honour. `desktop` may be omitted, which yields
 * {@link RevealPlan} `probe` so the caller can ask the Host and re-plan. When the
 * Host has no desktop, `paneAvailable` selects the plugin's own right-sidebar folder
 * pane — the last target that still shows something on a headless Host.
 */
export declare function revealPlanFor(args: {
    folderPath: string;
    template: string;
    desktop?: RevealDesktop;
    paneAvailable?: boolean;
}): RevealPlan;
//# sourceMappingURL=reveal.d.ts.map