import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "wrap-in-iife",
      generateBundle(outputOptions, bundle) {
        Object.keys(bundle).forEach((fileName) => {
          const file = bundle[fileName];
          if (fileName.slice(-3) === ".js" && "code" in file) {
            file.code = `
              (() => {
                ${file.code}
              })()`;
          }
        });
      },
    },
  ],
  build: {
    emptyOutDir: false,
    outDir: "build",
    rollupOptions: {
      input: {
        "content-script": "./src/content-script.ts",
      },
      output: {
        entryFileNames: "[name].js",
        inlineDynamicImports: true,
      },
    },
  },
});
