/**
 * Copy text on every origin the panel is reached through.
 *
 * `navigator.clipboard` only exists in a secure context, and this plugin is routinely
 * loaded over plain HTTP on a LAN address (`http://<nas>:2298`) as well as over the
 * reverse-proxied HTTPS entry. The legacy `textarea` + `execCommand` path is the only
 * one that works on the HTTP origin, so it is the fallback rather than an afterthought.
 */
export declare function copyToClipboard(text: string): Promise<boolean>;
//# sourceMappingURL=clipboard.d.ts.map