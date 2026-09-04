import { reactive, computed } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

/** Browser-level Notification permission (mirrors the Notification.permission API). */
export type NotificationPermission = 'default' | 'granted' | 'denied';

const state = reactive<{
  /** User-level preference: do we WANT notifications when conversion finishes? */
  enabled: boolean;
  /** Current browser-level permission. Updated on init and after a request. */
  permission: NotificationPermission;
}>({
  enabled: false,
  permission: 'default',
});

let initialized = false;
let storageUnsub: (() => void) | null = null;

/** Some browsers don't expose Notification at all (e.g. insecure contexts). */
function getNotificationCtor(): typeof Notification | null {
  if (typeof window === 'undefined') return null;
  return typeof window.Notification === 'function' ? window.Notification : null;
}

async function readBrowserPermission(): Promise<NotificationPermission> {
  const Ctor = getNotificationCtor();
  if (!Ctor) return 'denied';
  // Notification.permission is a static, not on the instance.
  return Ctor.permission as NotificationPermission;
}

async function initNotification(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const [enabled, permission] = await Promise.all([
    storageGet<boolean>(STORAGE_KEYS.notifyOnComplete, false),
    readBrowserPermission(),
  ]);
  state.enabled = enabled;
  state.permission = permission;

  storageUnsub = onStorageChange<boolean>(STORAGE_KEYS.notifyOnComplete, value => {
    if (typeof value === 'boolean') state.enabled = value;
  });
}

// HMR cleanup so hot reloads don't stack listeners.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    storageUnsub?.();
    storageUnsub = null;
    initialized = false;
  });
}

export function useNotification() {
  void initNotification();

  const enabled = computed<boolean>(() => state.enabled);
  const permission = computed<NotificationPermission>(() => state.permission);

  /**
   * Turn the user preference on. Asks the browser for permission when needed.
   * Returns the resulting permission state. If the browser refuses, the
   * preference is NOT saved (we don't want a stuck "enabled" that can't fire).
   */
  async function enable(): Promise<NotificationPermission> {
    const Ctor = getNotificationCtor();
    if (!Ctor) {
      state.permission = 'denied';
      return 'denied';
    }
    if (Ctor.permission === 'granted') {
      state.permission = 'granted';
      state.enabled = true;
      await storageSet(STORAGE_KEYS.notifyOnComplete, true);
      return 'granted';
    }
    if (Ctor.permission === 'denied') {
      // Browser blocks re-prompts; just reflect the truth.
      state.permission = 'denied';
      return 'denied';
    }
    // 'default' — ask the user
    let result: NotificationPermission;
    try {
      result = (await Ctor.requestPermission()) as NotificationPermission;
    } catch {
      result = 'denied';
    }
    state.permission = result;
    if (result === 'granted') {
      state.enabled = true;
      await storageSet(STORAGE_KEYS.notifyOnComplete, true);
    }
    return result;
  }

  async function disable(): Promise<void> {
    state.enabled = false;
    await storageSet(STORAGE_KEYS.notifyOnComplete, false);
  }

  /**
   * Fire-and-forget notification. Silently no-ops when:
   * - the preference is off
   * - the browser permission isn't granted
   * - the workbench tab is currently focused (no need to ping the user)
   * - the Notification API itself is unavailable
   */
  function notify(title: string, body: string, onClick?: () => void): void {
    if (!state.enabled) return;
    if (state.permission !== 'granted') return;
    const Ctor = getNotificationCtor();
    if (!Ctor) return;
    if (typeof document !== 'undefined' && document.hasFocus()) return;
    try {
      const n = new Ctor(title, {
        body,
        icon: '/icon/128.png',
        silent: false,
      });
      if (onClick) {
        n.onclick = (): void => {
          try {
            window.focus();
          } catch {
            // ignore
          }
          onClick();
          n.close();
        };
      }
    } catch {
      // Some browsers throw when invoked from background tabs; ignore.
    }
  }

  return { enabled, permission, enable, disable, notify };
}
