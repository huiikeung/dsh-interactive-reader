/**
 * RC2 Chat's same-origin local media contract, as implemented by the Host.
 *
 * A Markdown image whose destination is an absolute POSIX path (`/vol1/1000/a.png`)
 * is not a URL, so the protocol allowlist rejects it and the reading tab used to fall
 * back to the alt text. The Host serves workspace files at `/api/file?path=…` on the
 * same origin, which is exactly what the official chat markdown renders — see
 * `localPathMediaUrl` in `@deepseek-ai/dsh-client-ui-chat`.
 *
 * Authorization stays entirely Host-side: this only builds the URL, and the Host's own
 * file API decides whether the path may be read. A destination that is not an absolute
 * POSIX path on an HTTP(S) page resolves to nothing and keeps the alt fallback, so a
 * protocol-relative, relative, or Electron `file://` destination is never turned into
 * a request.
 */
export declare function localPathMediaUrl(protocol: string, origin: string, value: string): string | undefined;
/** Resolve an authored destination against the current page, as the Host sees it. */
export declare const pathImages: {
    resolve: (value: string) => string | undefined;
};
//# sourceMappingURL=platform-media.d.ts.map