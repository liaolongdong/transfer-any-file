import { STORAGE_KEYS, storageGet, storageSet } from '~/utils/storage';

/** Open/closed state of every persisted card, keyed by its `cardId`. */
export type CollapsedStateMap = Record<string, boolean>;

// The two bindings below are module-level on purpose. Declared inside `CollapsibleCard`'s
// `<script setup>` they would be created once **per instance** — `setup()` runs for every card — and
// would then serialize one card with itself, which is not the race: every card read-modify-writes
// the same key.

/** Tail of the write queue for the shared collapsedState map. */
let persistQueue: Promise<void> = Promise.resolve();

/** In-flight restore read, shared across cards mounting in the same flush. */
let restoreFlight: Promise<CollapsedStateMap> | null = null;

/**
 * Coerce whatever is stored into a usable map.
 *
 * Storage is untrusted input, and `queueCollapsedWrite` writes into the object it just read, so the
 * coercion has to hand back a map the caller owns: a stored `null`, string or array would make the
 * assignment throw inside a queue link, and a rejected link stalls every write behind it. Dropping
 * non-boolean entries is not data loss — a collapsed state that is not a boolean was never readable.
 */
function toCollapsedStateMap(value: unknown): CollapsedStateMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const map: CollapsedStateMap = {};
  for (const [cardId, collapsed] of Object.entries(value)) {
    if (typeof collapsed === 'boolean') map[cardId] = collapsed;
  }
  return map;
}

/**
 * Read the persisted map once per batch of mounts.
 *
 * Two cards mounting in the same flush used to pay one round trip each. The cache is cleared as soon
 * as the read settles, so a card that mounts *after* a write still sees what is stored then; one
 * that joins an in-flight read sees the snapshot that read returned.
 */
export function readCollapsedState(): Promise<CollapsedStateMap> {
  restoreFlight ??= storageGet<unknown>(STORAGE_KEYS.collapsedState, {})
    .then(toCollapsedStateMap)
    .finally(() => {
      restoreFlight = null;
    });
  return restoreFlight;
}

/**
 * Queue one card's state into the shared map.
 *
 * Every card writes the whole map, so two unchained writes interleave and the later one silently
 * drops the earlier card's key. Chaining is what makes the second write read what the first one
 * stored. Nothing here can reject — `storageGet`/`storageSet` swallow their own failures and
 * `toCollapsedStateMap` is total — so a link can never stall the queue behind it.
 */
export function queueCollapsedWrite(cardId: string, value: boolean): void {
  persistQueue = persistQueue.then(async () => {
    const map = toCollapsedStateMap(await storageGet<unknown>(STORAGE_KEYS.collapsedState, {}));
    map[cardId] = value;
    await storageSet(STORAGE_KEYS.collapsedState, map);
  });
}
