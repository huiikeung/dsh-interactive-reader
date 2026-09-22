import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Input, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives';
import { frostedGlassOf } from './fold-intensity.js';
import { deliverableOpenModeOf } from './open-file.js';
import { settingsCopyFor } from './settings-copy.js';
import { CONVENTIONAL_SKILL_ROOTS, detectGenerativeMcpappsSkill, shortestInstallCommand } from './skill-status.js';
import css from './SettingsSection.module.css';
function text(props, copy, key) {
    if (typeof props.t === 'function') {
        try {
            const value = props.t(key);
            if (typeof value === 'string' && value.length > 0 && value !== key)
                return value;
        }
        catch {
            // Fall through to the bundled dictionaries.
        }
    }
    return copy[key];
}
/** Chevron for a module that opens. */
function Chevron() {
    return (_jsx("svg", { className: css.chevron, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M6.5 4 10.5 8 6.5 12", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
/**
 * A module whose whole content is a labelled switch: title, description, control on the
 * first line's right. Always open, because the description is what the switch does.
 */
function SwitchModule({ title, description, checked, onChange, ...rest }) {
    return (_jsx("section", { className: css.module, ...rest, children: _jsxs("div", { className: css.moduleHead, children: [_jsxs("div", { className: css.moduleText, children: [_jsx("div", { className: css.moduleTitle, children: title }), _jsx("p", { className: css.moduleDesc, children: description })] }), _jsx("div", { className: css.moduleControl, children: _jsx(Switch, { checked: checked, onChange: onChange, label: title }) })] }) }));
}
/**
 * A module with a long body: its header is the toggle, and the body only renders once the
 * user opens it.
 */
function FoldModule({ title, trailing, children, ...rest }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("section", { className: css.module, "data-open": open || undefined, ...rest, children: [_jsxs("button", { type: "button", className: css.moduleToggle, "aria-expanded": open, onClick: () => setOpen(value => !value), children: [_jsx(Chevron, {}), _jsx("span", { className: css.moduleTitle, children: title }), trailing ? _jsx("span", { className: css.moduleTail, children: trailing }) : null] }), open ? _jsx("div", { className: css.moduleBody, children: children }) : null] }));
}
export function SettingsSection(props) {
    const copy = props.copy ?? settingsCopyFor(props.languageTag);
    const snap = useSyncExternalStore(props.prefs.subscribe, () => props.prefs.getSnapshot() ?? {}, () => ({}));
    const mode = deliverableOpenModeOf(snap.deliverableOpenMode);
    const glass = frostedGlassOf(snap);
    const autoFold = snap.autoFold !== false && snap.foldIntensity !== 0;
    const [fnosUrl, setFnosUrl] = useState(snap.fnosFileManagerUrl ?? '');
    useEffect(() => { setFnosUrl(snap.fnosFileManagerUrl ?? ''); }, [snap.fnosFileManagerUrl]);
    const on = mode === 'sidebar';
    const [skill, setSkill] = useState();
    const [checking, setChecking] = useState(false);
    const recheck = useCallback(async () => {
        setChecking(true);
        try {
            setSkill(await detectGenerativeMcpappsSkill(props.checkSkill));
        }
        catch {
            setSkill({
                name: 'generative-mcpapps',
                installed: false,
                via: null,
                roots: [],
                hostReached: false,
            });
        }
        finally {
            setChecking(false);
        }
    }, [props.checkSkill]);
    useEffect(() => { void recheck(); }, [recheck]);
    return (_jsxs("div", { className: css.section, "data-interactive-reader-settings": true, children: [_jsxs("header", { className: css.header, children: [_jsx("div", { className: css.headerTitle, children: text(props, copy, 'nav') }), _jsx("p", { className: css.headerDesc, children: text(props, copy, 'sectionSubtitle') })] }), _jsx(SwitchModule, { title: text(props, copy, 'openTitle'), description: text(props, copy, 'openDescription'), checked: on, "data-interactive-reader-open-mode": mode, onChange: next => { props.prefs.actions.setDeliverableOpenMode(next ? 'sidebar' : 'external'); } }), _jsx(SwitchModule, { title: text(props, copy, 'glassTitle'), description: text(props, copy, 'glassDescription'), checked: glass, "data-interactive-reader-glass": glass ? 'on' : 'off', onChange: next => { props.prefs.actions.setFrostedGlass(next); } }), _jsx(SwitchModule, { title: text(props, copy, 'foldTitle'), description: text(props, copy, 'foldDescription'), checked: autoFold, "data-interactive-reader-auto-fold": autoFold ? 'on' : 'off', onChange: next => {
                    props.prefs.actions.setAutoFold?.(next);
                    props.prefs.actions.setFoldIntensity?.(next ? 1 : 0);
                } }), _jsxs(FoldModule, { title: text(props, copy, 'fnosTitle'), "data-interactive-reader-fnos": true, "data-fnos-configured": fnosUrl.trim() !== '' || undefined, children: [_jsx("p", { className: css.moduleDesc, children: text(props, copy, 'fnosDescription') }), _jsx(Input, { type: "url", className: css.input, value: fnosUrl, spellCheck: false, autoComplete: "off", "aria-label": text(props, copy, 'fnosTitle'), placeholder: text(props, copy, 'fnosPlaceholder'), onChange: (event) => {
                            setFnosUrl(event.target.value);
                            props.prefs.actions.setFnosFileManagerUrl?.(event.target.value);
                        } }), _jsx("p", { className: css.hint, children: text(props, copy, 'fnosTokens') })] }), _jsxs(FoldModule, { title: text(props, copy, 'skillTitle'), trailing: _jsx(Tag, { tone: skill?.installed ? 'success' : 'neutral', children: skill?.installed ? text(props, copy, 'skillInstalled') : text(props, copy, 'skillMissing') }), "data-interactive-reader-skill": skill?.installed ? 'installed' : 'missing', children: [_jsx("p", { className: css.moduleDesc, children: text(props, copy, 'skillPurpose') }), _jsx("p", { className: css.moduleDesc, children: text(props, copy, 'skillPluginNote') }), skill && !skill.installed ? (_jsxs(_Fragment, { children: [_jsx("p", { className: css.moduleDesc, children: skill.hostReached ? text(props, copy, 'skillInstall') : text(props, copy, 'skillUnavailable') }), _jsx("pre", { className: css.pre, children: shortestInstallCommand() }), _jsx("ul", { className: css.roots, "data-interactive-reader-skill-roots": true, children: CONVENTIONAL_SKILL_ROOTS.map(root => (_jsx("li", { children: root }, root))) })] })) : null, _jsx("div", { className: css.actions, children: _jsx(Button, { variant: "outline", size: "sm", disabled: checking, onClick: () => { void recheck(); }, children: checking ? text(props, copy, 'skillChecking') : text(props, copy, 'skillRecheck') }) })] })] }));
}
//# sourceMappingURL=SettingsSection.js.map