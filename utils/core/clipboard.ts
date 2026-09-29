/**
 * Clipboard write with a fallback, as one call instead of the four-step try/catch each caller used
 * to write by hand.
 *
 * `navigator.clipboard.writeText` is the modern path and the only one that can be granted quietly,
 * but it is unavailable on a non-secure origin and can be refused outright when the page has no
 * user activation — both reachable here, because the workbench runs from `chrome-extension://` and a
 * click on a copy button is the only activation the caller gets. The legacy `execCommand('copy')`
 * route needs a selectable text node in the document, so it uses a detached textarea and removes it
 * again; nothing about the selection is left behind.
 *
 * Returns whether the text actually landed, rather than throwing: every call site in this project is
 * a user-initiated copy whose failure is a message, not an error state.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the legacy route below
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
