import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// У dev-режимі /api проксується на FastAPI, тому CORS локально не заважає.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8000" } },
});
