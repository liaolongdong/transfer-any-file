import { h } from 'vue';

/**
 * How long the toast stays up, which is also how long the reader has to take the action back.
 *
 * Five seconds is the window the history panel has always used; keeping one number for every undo in
 * the app is the point of this module — a toast that vanished on a different timer in each surface
 * would teach people not to trust it.
 */
const UNDO_WINDOW_MS = 5000;

/**
 * Options for {@linkcode offerUndo}.
 */
export interface UndoToastOptions {
  /** What was removed, already resolved through `t()` (e.g. `已移除 3 个文件`). */
  removedText: string;
  /** Label for the take-it-back button. */
  undoText: string;
  /** Shown after the restore ran; say nothing if `restore` cannot report success. */
  restoredText: string;
  /**
   * Puts the removed thing back. Called at most once: the toast is dismissed as soon as it is used,
   * so a double click cannot restore twice.
   */
  restore: () => void | Promise<void>;
}

/**
 * The app's one undo toast: an action that stays single-click but can be taken back for a few seconds.
 *
 * This is the project's answer to destructive-lite actions (clearing the staged list, deleting a
 * preset, removing history rows). A confirmation step on every one of them would be a worse trade than
 * a mistake that is recoverable while the toast is up, so the surfaces agree on a single affordance
 * rather than each inventing its own.
 *
 * `ElMessage` renders as `role="alert"`, so the same node is the screen-reader announcement. The
 * message is built with `h()`, never `dangerouslyUseHTMLString` — that option routes the text through
 * `innerHTML`, and this text carries names the user's files chose. The button is a plain `<button>`
 * because `el-button` needs the app context a detached VNode inside a teleported message does not
 * reliably carry; its styles live in `assets/styles/global.css` for the same reason (the node sits
 * outside every component's scope).
 *
 * @param options - See {@linkcode UndoToastOptions}.
 */
export function offerUndo({ removedText, undoText, restoredText, restore }: UndoToastOptions): void {
  // A toast can be clicked twice before it fades, and the second click would restore the same thing
  // again — a duplicated preset, a file list re-emitted over itself. Latched rather than dismissed:
  // `ElMessage.closeAll()` would also take away a different toast the reader still needs to read.
  let taken = false;
  const message = h('span', { class: 'undo-toast' }, [
    removedText,
    h(
      'button',
      {
        type: 'button',
        class: 'undo-toast__btn',
        onClick: () => {
          if (taken) return;
          taken = true;
          void restore();
          ElMessage.success(restoredText);
        },
      },
      undoText,
    ),
  ]);

  ElMessage({ type: 'success', duration: UNDO_WINDOW_MS, message });
}
