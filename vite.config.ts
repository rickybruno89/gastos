import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [reactRouter()],
  envDir: false,
  server: {
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${process.env.API_DEV_PORT ?? "3001"}`,
      "/healthz": `http://127.0.0.1:${process.env.API_DEV_PORT ?? "3001"}`,
    },
  },
});
