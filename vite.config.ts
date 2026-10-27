import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      // electron-builder writes installers here; watching them locks the files
      // and makes the next build fail with EPERM/EBUSY on Windows.
      ignored: ["**/release/**", "**/dist/**", "**/dist-electron/**"],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome130",
    chunkSizeWarningLimit: 1600,
  },
});
