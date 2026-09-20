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
/** One row: label and description on the left, its control on the first line's right. */
function Row({ title, description, control, ...rest }) {
    return (_jsxs("div", { className: css.row, ...rest, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: title }), _jsx("p", { className: css.rowDesc, children: description })] }), _jsx("div", { className: css.rowControl, children: control })] }));
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
    return (_jsxs("div", { className: css.section, "data-better-display-settings": true, children: [_jsx("header", { className: css.header, children: _jsxs("div", { className: css.headerText, children: [_jsx("div", { className: css.headerTitle, children: text(props, copy, 'nav') }), _jsx("p", { className: css.headerDesc, children: text(props, copy, 'sectionSubtitle') })] }) }), _jsxs("div", { className: css.rows, children: [_jsx(Row, { title: text(props, copy, 'openTitle'), description: text(props, copy, 'openDescription'), "data-better-display-open-mode": mode, control: _jsx(Switch, { checked: on, label: text(props, copy, 'openTitle'), onChange: next => { props.prefs.actions.setDeliverableOpenMode(next ? 'sidebar' : 'external'); } }) }), _jsx(Row, { title: text(props, copy, 'glassTitle'), description: text(props, copy, 'glassDescription'), "data-better-display-glass": glass ? 'on' : 'off', control: _jsx(Switch, { checked: glass, label: text(props, copy, 'glassTitle'), onChange: next => { props.prefs.actions.setFrostedGlass(next); } }) }), _jsx(Row, { title: text(props, copy, 'foldTitle'), description: text(props, copy, 'foldDescription'), "data-better-display-auto-fold": autoFold ? 'on' : 'off', control: _jsx(Switch, { checked: autoFold, label: text(props, copy, 'foldTitle'), onChange: next => {
                                props.prefs.actions.setAutoFold?.(next);
                                props.prefs.actions.setFoldIntensity?.(next ? 1 : 0);
                            } }) }), _jsxs("div", { className: css.field, "data-better-display-fnos": true, "data-fnos-configured": fnosUrl.trim() !== '' || undefined, children: [_jsx("div", { className: css.rowTitle, children: text(props, copy, 'fnosTitle') }), _jsx("p", { className: css.rowDesc, children: text(props, copy, 'fnosDescription') }), _jsx(Input, { type: "url", className: css.input, value: fnosUrl, spellCheck: false, autoComplete: "off", "aria-label": text(props, copy, 'fnosTitle'), placeholder: text(props, copy, 'fnosPlaceholder'), onChange: (event) => {
                                    setFnosUrl(event.target.value);
                                    props.prefs.actions.setFnosFileManagerUrl?.(event.target.value);
                                } }), _jsx("p", { className: css.hint, children: text(props, copy, 'fnosTokens') })] }), _jsxs("div", { className: css.block, "data-better-display-skill": skill?.installed ? 'installed' : 'missing', children: [_jsxs("div", { className: css.blockHead, children: [_jsx("div", { className: css.rowTitle, children: text(props, copy, 'skillTitle') }), _jsx(Tag, { tone: skill?.installed ? 'success' : 'neutral', children: skill?.installed ? text(props, copy, 'skillInstalled') : text(props, copy, 'skillMissing') })] }), _jsx("p", { className: css.rowDesc, children: text(props, copy, 'skillPurpose') }), _jsx("p", { className: css.rowDesc, children: text(props, copy, 'skillPluginNote') }), skill && !skill.installed ? (_jsxs(_Fragment, { children: [_jsx("p", { className: css.rowDesc, children: skill.hostReached ? text(props, copy, 'skillInstall') : text(props, copy, 'skillUnavailable') }), _jsx("pre", { className: css.pre, children: shortestInstallCommand() }), _jsx("ul", { className: css.roots, "data-better-display-skill-roots": true, children: CONVENTIONAL_SKILL_ROOTS.map(root => (_jsx("li", { children: root }, root))) })] })) : null, _jsx("div", { className: css.actions, children: _jsx(Button, { variant: "outline", size: "sm", disabled: checking, onClick: () => { void recheck(); }, children: checking ? text(props, copy, 'skillChecking') : text(props, copy, 'skillRecheck') }) })] })] })] }));
}
//# sourceMappingURL=SettingsSection.js.map