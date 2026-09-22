/**
 * Pin this plugin's settings-nav glyph at runtime.
 *
 * The `settings.section` slot contract carries no icon field — the core reads
 * only id/label/order, and its `navIcon(id)` falls back to the settings gear for
 * every unknown id. Patching that core bundle is not durable (a DSH runtime
 * re-extract, or another plugin installing or removing its own patch, wipes it),
 * so find our own nav cell and rewrite its <svg> in place instead: the shell's
 * element, class and box are kept, so nothing depends on the shell's hashed
 * class names, and a MutationObserver re-applies the glyph whenever the shell
 * re-renders the nav and would otherwise restore the gear.
 */
/** Geometry one nav glyph pins into the shell's own <svg>. */
export interface NavGlyphSpec {
    readonly viewBox: string;
    readonly markup: string;
    /** When set, the stroke trio is applied alongside the markup. */
    readonly stroke?: string;
    readonly strokeWidth?: string;
}
/** IconBrowseOutline16: a rounded page with two text lines. Geometry extracted from the DSH primitives. */
export declare function navGlyph(): NavGlyphSpec;
/**
 * Rewrite the shell's own <svg> inside this plugin's settings-nav cell.
 *
 * @param labels - Nav label texts that identify our cell (one per locale).
 * @param mark - Attribute stamped on the rewritten <svg> so it is pinned once.
 * @param glyph - Pure spec producer; a throw leaves the shell icon untouched.
 */
export declare function pinNavGlyph(labels: readonly string[], mark: string, glyph: () => NavGlyphSpec): void;
//# sourceMappingURL=nav-glyph.d.ts.map