import { fileURLToPath } from "node:url"
import { defineConfig } from "wxt"
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { ElementPlusResolver } from "unplugin-vue-components/resolvers"

// jspdf only imports these from its unused .html() API; stubbing them
// keeps ~200KB out of the bundle. Remove the aliases if .html() is ever needed.
const unbundledDepStub = fileURLToPath(new URL("./utils/stubs/unbundled-dep.ts", import.meta.url))

export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  // Keep explicit imports for project code; only Element Plus is auto-resolved
  imports: false,
  manifest: {
    name: "File Any Transfer",
    // Chrome Web Store caps this at 132 characters and matches searches against it, so it
    // leads with the verb, names the formats users actually search for, and states the
    // differentiator. Kept in sync with `package.json#description` (currently 129 chars).
    description:
      "Convert 14 file formats locally in your browser: Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. Batch, offline, no uploads.",
    // Only storage is used (history/preferences); no tab access needed
    permissions: ["storage"],
    // Icon click is handled in the background entrypoint (opens the options
    // workbench directly); an empty action keeps the toolbar icon clickable.
    // options_ui.open_in_tab is declared via meta tag in entrypoints/options/index.html.
    action: {},
  },
  vite: () => ({
    plugins: [
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: "auto-imports.d.ts",
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: "components.d.ts",
      }),
    ],
    resolve: {
      alias: {
        html2canvas: unbundledDepStub,
        canvg: unbundledDepStub,
      },
    },
  }),
})
