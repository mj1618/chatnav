import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "./",
  plugins: [
    mkcert(),
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "public/manifest.json",
          dest: ".",
        },
      ],
    }),
  ],
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: "./index.html",
        record: "./record.html",
        requestMic: "./request-mic.html",
        background: "./src/background.ts",
        "mic-test": "./mic-test.html",
        "offscreen-whisper": "./offscreen-whisper.html",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
