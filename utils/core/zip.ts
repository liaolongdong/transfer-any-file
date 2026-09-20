/**
 * Single lazy entry point for the ZIP engine.
 *
 * Every caller used to `import { … } from 'fflate'` at module scope, which put the library on
 * the first screen: the converters are registered eagerly at startup, so a top-level import in
 * `pdf-to-image` or `xlsx-to-csv` reached the entry chunk even though nothing compresses until a
 * conversion, an archive upload or a ZIP download actually runs. One cached promise keeps that a
 * single extra chunk no matter how many call sites ask for it.
 */

/** Full `fflate` module type, resolved without a runtime import. */
type Fflate = typeof import('fflate');

let fflatePromise: Promise<Fflate> | null = null;

/** Load `fflate` on first use and reuse the same module instance afterwards. */
export function loadFflate(): Promise<Fflate> {
  if (!fflatePromise) fflatePromise = import('fflate');
  return fflatePromise;
}
