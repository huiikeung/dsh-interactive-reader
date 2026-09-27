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
 * a request. The Desktop application base (`dsh-app://app`) follows the official
 * `fileMediaUrl` allowlist the same way.
 */
export function localPathMediaUrl(protocol, origin, value) {
    if (value.length === 0 || !value.startsWith('/') || value.startsWith('//'))
        return undefined;
    if (protocol === 'http:' || protocol === 'https:') {
        return `${origin}/api/file?path=${encodeURIComponent(value)}`;
    }
    if (protocol === 'dsh-app:' && origin === 'dsh-app://app') {
        return `dsh-app://app/api/file?path=${encodeURIComponent(value)}`;
    }
    return undefined;
}
/** Resolve an authored destination against the current page, as the Host sees it. */
export const readerPathImages = {
    resolve: (value) => typeof window === 'undefined' ? undefined
        : localPathMediaUrl(window.location.protocol, window.location.origin, value),
};
/** Markdown-facing alias kept for the local renderer import. */
export const pathImages = readerPathImages;
//# sourceMappingURL=platform-media.js.map