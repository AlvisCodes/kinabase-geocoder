import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 builds one self-contained HTML file (scripts and styles inlined) that opens straight from a
// double-click or a shared drive, with nothing to host. The default build is a normal static site.
const single = process.env.SINGLE === "1";

export default defineConfig({
  plugins: [vue(), ...(single ? [viteSingleFile()] : [])],
  server: {
    port: 5180
  },
  // Relative asset paths so the built folder works from any static host, sub-path or shared drive
  base: "./",
  build: single ? { outDir: "release", emptyOutDir: true } : undefined,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src")
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api", "if-function", "mixed-decls"]
      }
    }
  }
});
