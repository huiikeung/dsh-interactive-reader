import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useEffect, useState } from 'react';
import { basename } from './deliverables.js';
import { fileAddressFor } from './open-file.js';
import { FOLDER_TAB_ID, folderPathOf, folderTabDefinition, formatEntrySize, parentFolderOf, sortFolderEntries, } from './folder-address.js';
import css from './FolderPane.module.css';
/**
 * The right-sidebar folder pane body and its registration.
 *
 * This exists because DSH cannot point its own files tree at a path: that type is a
 * builtin page — no `patterns`, no `canOpen`, so it is never an address candidate —
 * and its root is derived from the session (`start(tab.id, cwd)`), never from the open
 * call. So「在文件夹中显示」gets its own address-routed tab type instead.
 *
 * Two rules come from the shell and are easy to get wrong:
 *
 * - The address must live under `dsh-resource://`; `sidebarRight.placeResource`
 *   refuses every other scheme outright (see `folder-address.ts`).
 * - The body is registered under the slot `sidebar.right.pane.tab`, keyed by the
 *   definition's `id`, and it receives the address through the seat-injected
 *   `useTabInfo()` hook rather than as a prop.
 *
 * Content comes from the official `workspaceFiles.list` Remote, which keeps listings
 * workspace-scoped and capped, instead of a read route of our own.
 */
export { folderAddressOf, folderPathOf, folderTabDefinition, folderTabTitle } from './folder-address.js';
export const FolderPaneBody = memo(function FolderPaneBody({ useTabInfo, sessionId, list }) {
    const info = useTabInfo?.();
    const address = info?.tab?.navigation?.address ?? '';
    const revision = info?.tab?.navigation?.revision ?? 0;
    const rootPath = folderPathOf(address);
    const openResource = info?.tab?.actions?.openResource;
    const [current, setCurrent] = useState(rootPath ?? '');
    // A new address on the same mounted tab re-roots the pane.
    useEffect(() => { setCurrent(rootPath ?? ''); }, [rootPath, revision]);
    const [listing, setListing] = useState();
    const [error, setError] = useState();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (list === undefined || current === '') {
            setLoading(false);
            setError(current === '' ? '这个面板没有可显示的目录。' : undefined);
            setListing(undefined);
            return undefined;
        }
        let live = true;
        setLoading(true);
        setError(undefined);
        void list(current).then(next => { if (live) {
            setListing(next);
            setLoading(false);
        } }, reason => { if (live) {
            setError(String(reason?.message ?? reason));
            setListing(undefined);
            setLoading(false);
        } });
        return () => { live = false; };
    }, [current, list]);
    const parent = parentFolderOf(current);
    const openFile = (name) => {
        if (openResource === undefined || sessionId === undefined)
            return;
        // The official session-scoped file address, so the shell's own preview opens it.
        openResource(fileAddressFor(sessionId, undefined, `${current.replace(/\/+$/, '')}/${name}`));
    };
    return (_jsxs("div", { className: css.pane, "data-interactive-reader-folder-pane": true, "data-folder": current, children: [_jsxs("div", { className: css.header, children: [parent !== null && (_jsx("button", { type: "button", className: css.up, title: `上级目录 (${parent})`, "aria-label": "\u4E0A\u7EA7\u76EE\u5F55", onClick: () => setCurrent(parent), children: _jsx("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M10.5 3.5 6 8l4.5 4.5", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) }) })), _jsx("span", { className: css.path, title: current, children: basename(current) || current })] }), loading && _jsx("p", { className: css.note, role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u2026" }), !loading && error !== undefined && _jsxs("p", { className: css.error, role: "alert", children: ["\u65E0\u6CD5\u8BFB\u53D6\u76EE\u5F55\uFF1A", error] }), !loading && error === undefined && listing !== undefined && listing.entries.length === 0 && (_jsx("p", { className: css.note, children: "\u8FD9\u4E2A\u76EE\u5F55\u662F\u7A7A\u7684\u3002" })), listing !== undefined && listing.entries.length > 0 && (_jsx("ul", { className: css.list, children: sortFolderEntries(listing.entries).map(entry => (_jsx("li", { className: css.item, children: _jsxs("button", { type: "button", className: css.entry, "data-kind": entry.type, title: entry.name, onClick: () => {
                            if (entry.type === 'directory') {
                                setCurrent(`${current.replace(/\/+$/, '')}/${entry.name}`);
                            }
                            else if (entry.type === 'file') {
                                openFile(entry.name);
                            }
                        }, children: [_jsx("svg", { viewBox: "0 0 16 16", width: "13", height: "13", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: entry.type === 'directory'
                                    ? _jsx("path", { d: "M2 4.5h4l1.5 2H14v6.5H2V4.5z", strokeWidth: "1.2", strokeLinejoin: "round" })
                                    : _jsxs(_Fragment, { children: [_jsx("path", { d: "M4 2.5h5l3 3V13.5H4V2.5z", strokeWidth: "1.2", strokeLinejoin: "round" }), _jsx("path", { d: "M9 2.5v3h3", strokeWidth: "1.2", strokeLinejoin: "round" })] }) }), _jsx("span", { className: css.name, children: entry.name }), entry.type === 'file' && _jsx("span", { className: css.size, children: formatEntrySize(entry.size) })] }) }, `${entry.type}:${entry.name}`))) })), listing?.truncated && _jsx("p", { className: css.note, children: "\u76EE\u5F55\u5185\u5BB9\u8FC7\u591A\uFF0C\u4EC5\u663E\u793A\u524D\u4E00\u90E8\u5206\u3002" })] }));
});
/**
 * Register the pane's type and body.
 *
 * Every step is optional on purpose: a shell without the sidebar registry leaves the
 * reveal chain without a pane target, which degrades to copying the path rather than
 * failing the whole plugin to load.
 */
export function installFolderPane(ctx) {
    const tabs = ctx.get?.('sidebarRightTabs');
    if (typeof tabs?.register !== 'function')
        return;
    // Resolved on each read rather than once: the bundle declares `remote.workspaceFiles`
    // as a dependency, but the namespace may land after this plugin's own install.
    const filesFace = () => ctx.remote?.workspaceFiles
        ?? ctx.get?.('remote.workspaceFiles')
        ?? (ctx.get?.('remote')?.workspaceFiles);
    const slots = ctx.slots;
    ctx.effect(() => tabs.register(folderTabDefinition), 'dsh-interactive-reader: folder pane tab type');
    ctx.effect(() => slots.inject('sidebar.right.pane.tab', () => slots.register({
        name: 'sidebar.right.pane.tab',
        key: FOLDER_TAB_ID,
        inject: (sessionId) => ({
            list: async (path) => {
                const files = filesFace();
                if (typeof files?.list !== 'function')
                    throw new Error('workspaceFiles.list is unavailable');
                const answer = await files.list(sessionId, path);
                if (!answer?.ok || answer.value === undefined) {
                    throw new Error(answer?.error?.message ?? '目录读取失败');
                }
                return answer.value;
            },
        }),
    }, FolderPaneBody)), 'dsh-interactive-reader: folder pane body');
}
//# sourceMappingURL=folder-pane.js.map