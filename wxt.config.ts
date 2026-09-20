import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// jspdf only imports these from its unused .html() API; stubbing them
// keeps ~200KB out of the bundle. Remove the aliases if .html() is ever needed.
const unbundledDepStub = fileURLToPath(new URL('./utils/stubs/unbundled-dep.ts', import.meta.url));

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
    ],
    resolve: {
      alias: {
        html2canvas: unbundledDepStub,
        canvg: unbundledDepStub,
      },
    },
  }),
});
