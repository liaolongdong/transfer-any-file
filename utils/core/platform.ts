/**
 * Platform detection shared by shortcut formatting and the upload hints.
 *
 * This is the single source of truth for "is the user on an Apple platform".
 * Keeping it here (rather than inline in a component or composable) prevents the
 * divergence where one call site checks `userAgentData.platform` and another
 * sniffs `navigator.userAgent` — the two disagree on iPadOS and on Chromium
 * builds where `navigator.platform` is frozen by UA reduction.
 */

/**
 * Detect an Apple platform (macOS / iOS / iPadOS).
 *
 * Source order: `navigator.userAgentData.platform` (Chromium-only, gated behind a
 * permissions policy) → `navigator.platform` (deprecated but still populated) →
 * `navigator.userAgent` (broadly supported fallback, frozen by UA reduction).
 * The guard exists because this runs at module load.
 */
export function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    (navigator as Navigator & { platform?: string }).platform ||
    '';
  return /mac|iphone|ipad|ipod/i.test(platform) || /mac|iphone|ipad|ipod/i.test(ua);
}

/** Evaluated once at module load — the platform cannot change during a page's life. */
export const isMac: boolean = detectMac();
