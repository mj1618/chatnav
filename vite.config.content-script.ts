import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: "build",
    rollupOptions: {
      input: {
        "content-script": "./src/content-script.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
