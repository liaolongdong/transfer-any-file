import { reactive, computed } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

/** Action identifiers the user can bind a shortcut to. Extend as new actions are added. */
export type ShortcutAction = 'convert';

export type ShortcutMap = Record<ShortcutAction, string>;

/** Serialized binding format: modifiers + key joined by `+`, e.g. `mod+enter`, `ctrl+shift+k`.
 *  - `mod` resolves to `cmd` on macOS, `ctrl` elsewhere (VS Code convention).
 *  - Modifiers: `ctrl`, `cmd`/`meta`/`mod`, `alt`/`option`, `shift`.
 *  - All parts case-insensitive; the key is the rightmost token. */
const DEFAULT_SHORTCUTS: ShortcutMap = {
  convert: 'mod+enter',
};

/** Reserved keys we refuse to bind globally. These either conflict with browser/extension
 *  shortcuts (Ctrl+T/W/N/L) or would hijack user expectations (Escape/Tab). */
const RESERVED_LOWER = new Set<string>([
  'tab',
  'escape',
  'capslock',
  'contextmenu',
  'printscreen',
  'scrolllock',
  'pause',
  'browser_home',
  'browser_search',
]);

/** Browser-level shortcuts we must not shadow because they would silently break. */
const RESERVED_COMBOS: Array<{ ctrl: boolean; meta: boolean; key: string }> = [
  { ctrl: true, meta: false, key: 't' },
  { ctrl: true, meta: false, key: 'w' },
  { ctrl: true, meta: false, key: 'n' },
  { ctrl: true, meta: false, key: 'l' },
  { ctrl: true, meta: false, key: 'r' },
  { ctrl: true, meta: false, key: 'p' },
  { ctrl: true, meta: false, key: 'f' },
  { ctrl: true, meta: false, key: 'h' },
  { ctrl: true, meta: false, key: 'j' },
  { ctrl: true, meta: false, key: 'd' },
  { ctrl: true, meta: false, key: 's' },
  { meta: true, ctrl: false, key: 'w' },
  { meta: true, ctrl: false, key: 'q' },
  { meta: true, ctrl: false, key: 'r' },
  { meta: true, ctrl: false, key: 't' },
  { meta: true, ctrl: false, key: 'n' },
];

/** Detect macOS once at module load. `navigator.userAgentData.platform` would be more
 *  modern but is Chromium-only and gated behind a permissions policy; UA sniffing is
 *  the broadly supported fallback. */
function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    (navigator as Navigator & { platform?: string }).platform ||
    '';
  return /mac|iphone|ipad|ipod/i.test(platform) || /mac|iphone|ipad|ipod/i.test(ua);
}

const isMac = detectMac();

const state = reactive<{ shortcuts: ShortcutMap }>({
  shortcuts: { ...DEFAULT_SHORTCUTS },
});

let initialized = false;
let storageUnsub: (() => void) | null = null;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const stored = await storageGet<Partial<ShortcutMap>>(STORAGE_KEYS.shortcuts, {});
  state.shortcuts = { ...DEFAULT_SHORTCUTS, ...normalizeMap(stored) };
  storageUnsub = onStorageChange<Partial<ShortcutMap>>(STORAGE_KEYS.shortcuts, value => {
    state.shortcuts = { ...DEFAULT_SHORTCUTS, ...normalizeMap(value) };
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    storageUnsub?.();
    storageUnsub = null;
    initialized = false;
  });
}

/** Coerce arbitrary stored shape into a complete map. Drops invalid entries. */
function normalizeMap(input: Partial<ShortcutMap> | undefined): Partial<ShortcutMap> {
  if (!input || typeof input !== 'object') return {};
  const out: Partial<ShortcutMap> = {};
  for (const action of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
    const raw = (input as Record<string, unknown>)[action];
    if (typeof raw === 'string') {
      const cleaned = sanitize(raw);
      if (cleaned) out[action] = cleaned;
    }
  }
  return out;
}

/** Lowercase + trim; throw on empty. */
function sanitize(binding: string): string | null {
  const trimmed = binding.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

/** Split a binding into its modifier and key parts. The key is always the last token.
 *  Rejects modifier-only bindings and bindings with no recognizable key. */
export function parseBinding(binding: string): { key: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean } | null {
  const clean = sanitize(binding);
  if (!clean) return null;
  const parts = clean.split('+').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  if (mods.has('mod')) {
    mods.delete('mod');
    if (isMac) mods.add('cmd');
    else mods.add('ctrl');
  }
  if (mods.has('meta')) mods.add('cmd');
  if (mods.has('option')) mods.add('alt');
  if (RESERVED_LOWER.has(key)) return null;
  const ctrl = mods.has('ctrl');
  const meta = mods.has('cmd');
  const alt = mods.has('alt');
  const shift = mods.has('shift');
  if (!ctrl && !meta && !alt && !shift) return null;
  return { key, ctrl, meta, alt, shift };
}

/** Validate a binding string. Returns null on success, otherwise a reason key. */
export function validateBinding(binding: string): string | null {
  const parsed = parseBinding(binding);
  if (!parsed) return 'invalid';
  const comboKey = parsed.key;
  if (RESERVED_COMBOS.some(c => c.key === comboKey && c.ctrl === parsed.ctrl && c.meta === parsed.meta)) {
    return 'reserved';
  }
  return null;
}

/** Return a normalized, lowercased canonical form (collapses `meta` → `cmd`, `option` → `alt`). */
export function canonicalize(binding: string): string | null {
  const parsed = parseBinding(binding);
  if (!parsed) return null;
  const mods: string[] = [];
  if (parsed.ctrl) mods.push('ctrl');
  if (parsed.meta) mods.push('cmd');
  if (parsed.alt) mods.push('alt');
  if (parsed.shift) mods.push('shift');
  // Stable order helps storage equality and tests.
  const modOrder = ['ctrl', 'cmd', 'alt', 'shift'];
  mods.sort((a, b) => modOrder.indexOf(a) - modOrder.indexOf(b));
  return [...mods, parsed.key].join('+');
}

/** Pretty-print a binding for the UI, expanding `mod` to ⌘/Ctrl per platform. */
export function formatBinding(binding: string): string {
  const parsed = parseBinding(binding);
  if (!parsed) return binding;
  const pieces: string[] = [];
  if (parsed.ctrl) pieces.push(isMac ? '⌃' : 'Ctrl');
  if (parsed.meta) pieces.push('⌘');
  if (parsed.alt) pieces.push(isMac ? '⌥' : 'Alt');
  if (parsed.shift) pieces.push(isMac ? '⇧' : 'Shift');
  pieces.push(prettifyKey(parsed.key));
  if (isMac) {
    return pieces.join(' ');
  }
  return pieces.join(' + ');
}

function prettifyKey(key: string): string {
  if (key.length === 1) return key.toUpperCase();
  switch (key) {
    case 'enter':
      return 'Enter';
    case 'arrowup':
      return '↑';
    case 'arrowdown':
      return '↓';
    case 'arrowleft':
      return '←';
    case 'arrowright':
      return '→';
    case ' ':
      return 'Space';
    case ',':
      return ',';
    case '.':
      return '.';
    case '/':
      return '/';
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

/** Test a KeyboardEvent against a binding. */
export function matchEvent(binding: string, event: KeyboardEvent): boolean {
  const parsed = parseBinding(binding);
  if (!parsed) return false;
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.metaKey !== parsed.meta) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  // Normalize: event.key is case-sensitive for letters; compare lowercased.
  const eventKey = event.key.toLowerCase();
  if (eventKey === parsed.key) return true;
  // Some keys report different `key` values depending on layout/locale.
  if (parsed.key === 'enter' && event.key === 'Enter') return true;
  if (parsed.key === ' ' && event.key === ' ') return true;
  return false;
}

/** Serialize a KeyboardEvent back into a binding string, or null if it isn't a valid combo. */
export function eventToBinding(event: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = (event.key || '').toLowerCase();
  if (!key || key === 'control' || key === 'meta' || key === 'shift' || key === 'alt') return null;
  parts.push(key);
  return parts.join('+');
}

export function useShortcuts() {
  void init();

  const isMacPlatform = computed<boolean>(() => isMac);

  function getBinding(action: ShortcutAction): string {
    return state.shortcuts[action] || DEFAULT_SHORTCUTS[action];
  }

  function formatAction(action: ShortcutAction): string {
    return formatBinding(getBinding(action));
  }

  async function setBinding(action: ShortcutAction, binding: string): Promise<void> {
    const canonical = canonicalize(binding);
    if (!canonical) throw new Error('invalid');
    state.shortcuts = { ...state.shortcuts, [action]: canonical };
    await storageSet(STORAGE_KEYS.shortcuts, { ...state.shortcuts });
  }

  async function resetAction(action: ShortcutAction): Promise<void> {
    const next: ShortcutMap = { ...state.shortcuts, [action]: DEFAULT_SHORTCUTS[action] };
    state.shortcuts = next;
    await storageSet(STORAGE_KEYS.shortcuts, next);
  }

  function matches(action: ShortcutAction, event: KeyboardEvent): boolean {
    return matchEvent(getBinding(action), event);
  }

  return {
    isMacPlatform,
    getBinding,
    formatAction,
    setBinding,
    resetAction,
    matches,
    parseBinding,
    validateBinding,
    canonicalize,
    eventToBinding,
    formatBinding,
    matchEvent,
  };
}
