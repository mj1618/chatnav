import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "./",
  plugins: [
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
        whisper: "./offscreen-whisper.html",
        deepgram: "./offscreen-deepgram.html",
        requestMic: "./request-mic.html",
        background: "./src/background.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
