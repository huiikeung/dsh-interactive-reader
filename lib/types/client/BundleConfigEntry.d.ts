import type { BetterDisplaySettingsInjected } from './SettingsSection.js';
/**
 * The plugin manager's `plugins.bundle.config` entry for this bundle.
 *
 * `view: 'page'` renders the same Interactive Reader panel the Settings page
 * shows — the live controls, not a description of them — between the bundle's
 * description and its rows. `view: 'summary'` renders the one-liner the
 * manager may show wherever a full form does not fit. The injected face is the
 * same object the settings.section entry receives, so both surfaces read and
 * write one preference store.
 */
export declare function BundleConfigEntry(props: {
    view: 'summary' | 'page';
} & BetterDisplaySettingsInjected): import("react").JSX.Element;
//# sourceMappingURL=BundleConfigEntry.d.ts.map