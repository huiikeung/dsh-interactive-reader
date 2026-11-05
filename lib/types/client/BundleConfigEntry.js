import { jsx as _jsx } from "react/jsx-runtime";
import { SettingsSection } from './SettingsSection.js';
import { settingsCopyFor } from './settings-copy.js';
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
export function BundleConfigEntry(props) {
    const copy = props.copy ?? settingsCopyFor(props.languageTag);
    if (props.view !== 'page') {
        return _jsx("span", { "data-interactive-reader-config-summary": true, children: copy.sectionSubtitle });
    }
    // The manager page already carries the plugin name and description; the panel renders its modules alone.
    return _jsx(SettingsSection, { prefs: props.prefs, copy: props.copy, languageTag: props.languageTag, checkSkill: props.checkSkill, probeDesktop: props.probeDesktop, showHeader: false });
}
//# sourceMappingURL=BundleConfigEntry.js.map