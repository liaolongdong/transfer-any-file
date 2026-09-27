/**
 * A tab-side "your batch is done" marker that needs no permission.
 *
 * `useNotification.notify()` — the cue sitting next to this one — is opt-in *and* returns early
 * while this tab is focused, so the default configuration had no completion signal at all for the
 * most common setup: one workbench tab that you switch away from while a long batch runs. Writing
 * the marker into `document.title` costs nothing the app does not already have (no new permission,
 * no new manifest key, nothing leaves the page) and is readable from the tab strip.
 *
 * It is a static marker, not a blink: a timer running until the user comes back would spend CPU
 * and battery decorating a tab nobody is looking at, and a blink would itself need a
 * `prefers-reduced-motion` path.
 *
 * It is also deliberately *not* gated on the `fat:notifyOnComplete` preference. That toggle is off
 * by default and its copy promises a desktop notification specifically ("转换完成后发送桌面通知"),
 * so gating this on it would leave the configuration most users are in with no signal at all — which
 * is exactly the gap being closed here.
 */

/** The title as it was before the marker, kept so it can be restored verbatim. */
let baseTitle: string | null = null;
/** The title this module wrote, kept so a later rewrite by someone else is not undone. */
let currentMark: string | null = null;

function handleReturn(): void {
  if (document.visibilityState !== 'visible') return;
  clearAttention();
}

/**
 * Show `marked` as the tab title, unless the user is already looking at the page — in which case
 * the result panel is the cue and a title change would only be noise.
 *
 * The caller composes the string (it owns the localized text), so this module stays free of i18n
 * and of the title's actual format.
 */
export function markBatchComplete(marked: string): void {
  if (typeof document === 'undefined') return;
  // A previous batch is still unread; an older "done" is more true than a newer one.
  if (currentMark !== null) return;
  if (document.hasFocus()) return;

  baseTitle = document.title;
  currentMark = marked;
  document.title = marked;

  document.addEventListener('visibilitychange', handleReturn);
  window.addEventListener('focus', handleReturn);
}

/**
 * Drop the marker and put the original title back.
 *
 * The restore is conditional on nobody having written the title since: a language switch while the
 * marker was up goes through `applyDocumentLocale`, and stamping the pre-switch title back over it
 * would revert that change. In that case the marker simply disappears with the title it was on.
 *
 * Exported because a new run supersedes an unread completion — the stale marker must not survive
 * into the batch that replaces it.
 */
export function clearAttention(): void {
  if (typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', handleReturn);
  window.removeEventListener('focus', handleReturn);
  if (currentMark === null) return;
  if (document.title === currentMark && baseTitle !== null) document.title = baseTitle;
  currentMark = null;
  baseTitle = null;
}
