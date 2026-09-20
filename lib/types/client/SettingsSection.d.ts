import { type FoldIntensity } from './fold-intensity.js';
import { type DeliverableOpenMode } from './open-file.js';
import { type SettingsCopy, type SettingsCopyKey } from './settings-copy.js';
import { type SkillStatusProbe } from './skill-status.js';
/**
 * The Better Display section.
 *
 * The section title sits outside any border, and **each module carries its own** — so the
 * panel reads as a list of independent settings instead of one slab. Modules whose body is
 * long (the fnOS template, the skill report) keep that body behind a click, so the panel
 * stays scannable; a module that is nothing but a labelled switch stays open, because its
 * description is the setting.
 *
 * Controls come from the shell's own `Switch` / `Input` / `Button` / `Tag` primitives, so
 * the section looks like the rest of Settings rather than like a plugin.
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