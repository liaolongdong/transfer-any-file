import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// jspdf only imports these from its unused .html() API; stubbing them
// keeps ~200KB out of the bundle. Remove the aliases if .html() is ever needed.
const unbundledDepStub = fileURLToPath(new URL('./utils/stubs/unbundled-dep.ts', import.meta.url));

/**
 * Deletes the remotely hosted code paths that third-party libraries keep but this extension never
 * reaches, because the Chrome Web Store rejects a Manifest V3 package for *containing* them whether
 * or not they ever run (this was the 2026-09-21 rejection, after two content-policy ones).
 *
 * Two shapes, both found by scanning the built bundle rather than the source tree:
 *   - jsPDF 4.2.1 `output('pdfobjectnewwindow')`: opens a window and appends a `<script>` whose `src`
 *     is a hardcoded cdnjs URL (and honours `options.pdfObjectUrl`, so a caller could point it
 *     anywhere). Only `output('blob')` is called here, so deleting the `case` clause routes that mode
 *     to jsPDF's own `default: return null`.
 *   - pdf.js `PDFWorker._createCDNWrapper()`: builds the text `` await import("<url>") `` into a Blob
 *     and starts a Worker from it, reached only when `workerSrc` is cross-origin. Ours is a packaged
 *     asset (`pdfjs-dist/build/pdf.worker.min.mjs?url`), so making it an identity function changes
 *     nothing on any path this extension can take; a hypothetical cross-origin `workerSrc` now fails
 *     at `new Worker()` inside pdf.js's own try/catch and degrades to the main-thread parser, which is
 *     the right outcome for an offline extension anyway.
 *
 * Both run in `transform`, not `renderChunk`: rolldown minifies after every JavaScript hook, so a
 * chunk-level hook would only ever see the pre-minification text. That means each pattern targets the
 * module as its publisher ships it — `jspdf` ships only the minified `dist/jspdf.es.min.js`, while
 * `pdfjs-dist/build/pdf.mjs` is unminified — and both tolerate either quoting style.
 *
 * A vendor bump can stop matching these silently, which is why `pnpm verify:remote-code` asserts the
 * markers are absent from the artifact. Run it after any dependency change; do not assume this
 * plugin did its job.
 */
function stripRemotelyHostedCode() {
  // jsPDF's whole `output('pdfobjectnewwindow')` case clause, through the `throw` that closes it.
  const pdfObjectCdnBranch = /case(["`'])pdfobjectnewwindow\1\s*:[\s\S]*?browser-environment\.\1\s*\)\s*;?/;
  // pdf.js's generated-import worker wrapper, and the call site that reaches it.
  const cdnWorkerWrapper = /this\._createCDNWrapper\s*=\s*[^{]*\{[\s\S]*?text\/javascript["']\s*\}\s*\)\s*\)\s*;\s*\};/;

  return {
    name: 'strip-remotely-hosted-code',
    // Before any other transform, so nothing downstream rewrites what these patterns look for.
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (/[\\/](?:jspdf|pdfjs-dist)[\\/]/.test(id)) {
        const next = code
          .replace(pdfObjectCdnBranch, '')
          .replace(cdnWorkerWrapper, 'this._localWorkerSrc = (url) => url;')
          .replaceAll('_createCDNWrapper', '_localWorkerSrc');
        if (next !== code) return next;
      }
      return null;
    },
  };
}

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  // Keep explicit imports for project code; only Element Plus is auto-resolved
  imports: false,
  manifest: {
    // The packaged name and description are message keys, not strings: Chrome resolves `__MSG_x__`
    // against the browser's UI language and falls back to `default_locale`. With `zh_CN` as the default,
    // a Chinese system gets the Chinese name everywhere Chrome shows it (extension manager, install
    // prompt, Chrome Web Store default listing) while English keeps its own localized copy from
    // `_locales/en/`. The wording rationale for each sentence lives with the copy in
    // `public/_locales/{zh_CN,en}/messages.json`, mirrored in `CHROMEWEBSTORE.md`.
    default_locale: 'zh_CN',
    name: '__MSG_extensionName__',
    // Store caps this at 132 characters and matches searches against it. Both locales are measured by
    // `pnpm verify:listing`, which also asserts each one equals its `CHROMEWEBSTORE.md` paste block;
    // `_locales/en` is additionally compared against `package.json#description` by `pnpm verify:meta`.
    description: '__MSG_extensionDescription__',
    // Only storage is used (history/preferences); no tab access needed
    permissions: ['storage'],
    // Icon click is handled in the background entrypoint (opens the options
    // workbench directly); an empty action keeps the toolbar icon clickable.
    // options_ui.open_in_tab is declared via meta tag in entrypoints/options/index.html.
    action: {},
  },
  vite: () => ({
    plugins: [
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: 'auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'components.d.ts',
      }),
      stripRemotelyHostedCode(),
    ],
    resolve: {
      alias: {
        html2canvas: unbundledDepStub,
        canvg: unbundledDepStub,
      },
    },
  }),
});
