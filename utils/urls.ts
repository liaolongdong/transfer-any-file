/**
 * Every off-site address the interface can send a click to.
 *
 * Kept in one module because two of them (the store listing and the latest release) are shown in
 * more than one place: a literal copied twice drifts the day one copy is edited. Nothing here is
 * probed or fetched — an `<a href>` reaches the network only when the user clicks, and it is the
 * browser that opens it, not this page.
 */
export const REPO_GITHUB_URL = 'https://github.com/liaolongdong/transfer-any-file';

/** The template chooser, not a blank issue: `.github/ISSUE_TEMPLATE/` asks for the details a report needs. */
export const REPO_ISSUES_URL = `${REPO_GITHUB_URL}/issues/new/choose`;

/** The full MIT text inside the repository — the About drawer's license line points here. */
export const REPO_LICENSE_URL = `${REPO_GITHUB_URL}/blob/main/LICENSE`;

export const GITHUB_RELEASES_PAGE_URL = `${REPO_GITHUB_URL}/releases/latest`;

export const AUTHOR_GITHUB_URL = 'https://github.com/liaolongdong';

/**
 * The live listing. The item ID is the one recorded in the "现网状态" block at the top of
 * `.github/CHROMEWEBSTORE.md`; a typo here sends every installer to a 404 that no other gate sees.
 */
export const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/blkdmpkcaceicinkhindniepbbbaekkb';

/**
 * Product site (GitHub Pages). Both languages live in the same document and are shown by
 * `<html lang>`, so one address serves a Chinese and an English reader alike.
 */
export const PRODUCT_DOCS_URL = 'https://liaolongdong.github.io/transfer-any-file/';
export const CONVERSION_GUIDES_URL = `${PRODUCT_DOCS_URL}convert/`;
export const PRIVACY_POLICY_URL = `${PRODUCT_DOCS_URL}privacy.html`;
