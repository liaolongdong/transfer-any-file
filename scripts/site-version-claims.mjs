/**
 * The version claims `docs/index.html` makes about itself, in one place.
 *
 * Two consumers need the identical list, and until now each carried its own copy:
 * `scripts/release.mjs` rewrites every one of them during a version bump, and
 * `scripts/check-package-meta.mjs` (`pnpm verify:meta`) asserts each still names the current version.
 * Two hand-maintained copies of a list whose whole purpose is "never leave one behind" is how the 1.3.0
 * drift stayed shipped: a sentence added to the page can be absorbed by the writer and missed by the
 * guard — the bump then succeeds and nothing goes red — or the other way round, and a legitimate page
 * edit turns every release red. With one source, the only way to be wrong on both sides is to be wrong
 * here, once.
 *
 * The needles are literal page text, not patterns: each must occur exactly once in the file, so a
 * restructure that removes one stops the bump rather than shipping a half-updated page. Change the page
 * and this list together.
 */

/** The machine-readable claim, pinned to `package.json#version` by `pnpm verify:meta` on its own. */
const JSON_LD_CLAIM = '"softwareVersion": "${version}"';

/** The prose claims — the sentences a reader actually sees, as opposed to the JSON-LD field. */
const PROSE_CLAIMS = [
  '文件格式任意转换助手 ${version} 的实际转换能力',
  'Actual conversion capability in Transfer Any File ${version}',
  '（${version} 构建',
  '(the ${version} build',
  '<strong>版本 ${version} ·',
  '<strong>Version ${version} ·',
  '>v${version}</a',
];

/**
 * @param {string} version The version the page is supposed to name, e.g. `1.9.0`.
 * @returns {string[]} Every literal needle that version must appear in exactly once, JSON-LD first.
 */
export function versionClaims(version) {
  return [JSON_LD_CLAIM, ...PROSE_CLAIMS].map(claim => claim.replace('${version}', version));
}

/**
 * @param {string} version The version the page is supposed to name.
 * @returns {string[]} The prose subset — what the guard checks, since the JSON-LD field has its own check.
 */
export function visibleVersionClaims(version) {
  return PROSE_CLAIMS.map(claim => claim.replace('${version}', version));
}
