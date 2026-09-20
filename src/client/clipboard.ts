/**
 * Copy text on every origin the panel is reached through.
 *
 * `navigator.clipboard` only exists in a secure context, and this plugin is routinely
 * loaded over plain HTTP on a LAN address (`http://<nas>:2298`) as well as over the
 * reverse-proxied HTTPS entry. The legacy `textarea` + `execCommand` path is the only
 * one that works on the HTTP origin, so it is the fallback rather than an afterthought.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (text === '') return false;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Insecure origin, missing permission, or a refused write: use the DOM path.
  }
  try {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}
