import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:8787",
        changeOrigin: true,
        headers: {
          "X-Auth-Request-Email": process.env.DEV_AUTH_EMAIL ?? "dev@bettertool.local",
          "X-Auth-Request-User": process.env.DEV_AUTH_USER ?? "dev",
          "X-Auth-Request-Groups": process.env.DEV_AUTH_GROUPS ?? "admin",
        },
      },
    },
  },
});
