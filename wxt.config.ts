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
    description:
      "Convert between common file types locally - MD, HTML, DOCX, PDF, XLSX, CSV, Images and more",
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
