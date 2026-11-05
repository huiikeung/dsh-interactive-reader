import { type FoldIntensity } from './fold-intensity.js';
import { type DeliverableOpenMode } from './open-file.js';
import { type SettingsCopy, type SettingsCopyKey } from './settings-copy.js';
import { type SkillStatusProbe } from './skill-status.js';
import { type RevealDesktop } from './reveal.js';
/**
 * The Interactive Reader section.
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
    /**
     * Ask the Host what it can do with a produced path on its own machine.
     * A desktop Host (`available: true`) never uses the fnOS file manager, so
     * the fnOS section stays hidden there; a headless Host (NAS) shows it.
     */
    probeDesktop?: () => Promise<RevealDesktop>;
}
type SettingsProps = BetterDisplaySettingsInjected & {
    /** Official settings.section owner share; unused here. */
    close?: () => void;
    t?: (key: SettingsCopyKey) => string;
    /**
     * False on surfaces that already carry the plugin's name and description
     * themselves — the plugin manager's detail page — so the panel renders its
     * modules alone instead of repeating the header. Defaults to true (Settings).
     */
    showHeader?: boolean;
};
export declare function SettingsSection(props: SettingsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SettingsSection.d.ts.map