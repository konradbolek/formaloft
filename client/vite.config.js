import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [".."] },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        timeout: 240000,
        proxyTimeout: 240000,
      },
      "/uploads": "http://127.0.0.1:3001",
    },
  },
});
