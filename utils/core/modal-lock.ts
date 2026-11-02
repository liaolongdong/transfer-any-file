/**
 * Detecting a modal that this app did not open.
 *
 * The workbench keeps two flags for the overlays it owns (preferences, about) and gates the convert
 * shortcut, the uploader and the page-wide drop veil on them. That guard is only as wide as its list:
 * the preview dialog is mounted by `FileUpload`, and `ElMessageBox.confirm` is created imperatively by
 * whichever composable needs it, so neither appears in App-level state. Both are nonetheless modal,
 * and while either is up a ⌘/Ctrl+Enter would start a batch behind it and a dragged file would raise a
 * veil with `z-index: 9999` over Element Plus's 2000+ stack — the exact hazard the App-level flags
 * exist to prevent.
 *
 * So this reads the lock Element Plus itself puts on the page instead of a list of our own state.
 * `useLockscreen` adds the namespace-built `parent--hidden` class to `document.body` for as long as any
 * `lock-scroll` overlay is open (dialog, drawer, message box), which covers every current and future
 * call site — including ones added in files this module has never heard of.
 */

/** The body class Element Plus builds as `ns.bm('parent', 'hidden')` for the `el` namespace. */
const LOCK_CLASS = 'el-popup-parent--hidden';

/**
 * Whether any Element Plus modal currently holds the page.
 *
 * A function rather than a `computed`: the class lives in the DOM, so no reactive dependency would
 * invalidate a cached read, and a stale `true` would disable the shortcut for the rest of the session.
 * Every caller invokes it from inside an event handler, where the read is already on demand.
 *
 * @returns True while an Element Plus overlay has the body locked.
 */
export function isPageLockedByModal(): boolean {
  return document.body.classList.contains(LOCK_CLASS);
}
