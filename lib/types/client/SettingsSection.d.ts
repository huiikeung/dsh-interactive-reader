import { type FoldIntensity } from './fold-intensity.js';
import { type DeliverableOpenMode } from './open-file.js';
import { type SettingsCopy, type SettingsCopyKey } from './settings-copy.js';
import { type SkillStatusProbe } from './skill-status.js';
/**
 * The Better Display section.
 *
 * One card: a titled header, then hairline-separated rows whose control rides the first
 * line of the label instead of centring against a multi-line description, and full-width
 * fields with their hint underneath. Controls come from the shell's own `Switch` /
 * `Input` / `Button` / `Tag` primitives so the section looks like the rest of Settings
 * rather than like a plugin.
 */
export interface ReaderPrefsSnapshot {
    deliverableOpenMode?: DeliverableOpenMode;
    frostedGlass?: boolean;
    foldIntensity?: FoldIntensity;
    autoFold?: boolean;
    processOnly?: boolean;
    /** fnOS file-manager URL template; empty means "use the Host opener only". */
    fnosFileManagerUrl?: string;
}
export interface OpenPrefs {
    getSnapshot: () => ReaderPrefsSnapshot;
    subscribe: (fn: () => void) => () => void;
    actions: {
        setDeliverableOpenMode: (value: DeliverableOpenMode) => void;
        setFrostedGlass: (value: boolean) => void;
        setFoldIntensity?: (value: FoldIntensity) => void;
        setAutoFold?: (value: boolean) => void;
        setFnosFileManagerUrl?: (value: string) => void;
    };
}
export interface BetterDisplaySettingsInjected {
    prefs: OpenPrefs;
    copy?: SettingsCopy;
    languageTag?: string;
    checkSkill: SkillStatusProbe;
}
type SettingsProps = BetterDisplaySettingsInjected & {
    /** Official settings.section owner share; unused here. */
    close?: () => void;
    t?: (key: SettingsCopyKey) => string;
};
export declare function SettingsSection(props: SettingsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SettingsSection.d.ts.map