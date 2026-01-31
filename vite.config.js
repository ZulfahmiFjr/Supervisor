import { defineConfig } from "vite";
import path from "path";

const WEB_PORT = process.env.ATLAS_WEB_PORT || "8080";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/config.json": `http://127.0.0.1:${WEB_PORT}`,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
