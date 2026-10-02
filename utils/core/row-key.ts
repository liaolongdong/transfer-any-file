import { toRaw } from 'vue';

/**
 * Mint stable `v-for` keys for objects that carry no id of their own — a staged `File`, the source
 * `File` behind a conversion result.
 *
 * Position is not a key. Both lists this feeds are wrapped in a `<TransitionGroup>`, and an index key
 * re-keys every row below a removal: deleting the first of five unmounts four and mounts four again, so
 * one departure reads as the whole tail flickering out and back in. The object itself is the only
 * identity these rows have, and `:key` only accepts a `PropertyKey` — hence an id minted once per object
 * and remembered in a `WeakMap`.
 *
 * `toRaw()` guards the lookup: a `ref` array hands out proxies, and although Vue does not proxy a `File`
 * (its `getTargetType` only reacts on Object/Array/collection tags), if that ever changed the map would
 * key on a fresh proxy per render and hand out a new id every frame.
 *
 * @param prefix label baked into the minted keys, so a devtools inspection says which list a row came from
 * @returns a lookup that answers with the same key for the same object, every time
 */
export function createRowKey(prefix: string): (item: object) => string {
  const keys = new WeakMap<object, string>();
  let sequence = 0;
  return (item: object): string => {
    const target = toRaw(item);
    let key = keys.get(target);
    if (key === undefined) {
      key = `${prefix}-${++sequence}`;
      keys.set(target, key);
    }
    return key;
  };
}
