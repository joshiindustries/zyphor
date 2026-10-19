import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Default: served by FastAPI at /app/. For a standalone deploy (e.g. Vercel) set
// VITE_BASE=/ and VITE_API_BASE=https://your-backend.example.com
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/app/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Force all shared UI primitives into a dedicated chunk so that lazy
          // page chunks (Exam, Console, etc.) always find them already initialized.
          if (
            id.includes("src/components/ui.jsx") ||
            id.includes("src/components/ui/") ||
            id.includes("src/components/Recovery") ||
            id.includes("src/components/ExamConnectionStatus") ||
            id.includes("src/lib/utils") ||
            id.includes("src/lib/format") ||
            id.includes("src/lib/api") ||
            id.includes("src/lib/auth")
          ) {
            return "shared-zyphor";
          }
          // Keep heavy vendor libs in their own chunks
          if (id.includes("node_modules/@uiw") || id.includes("node_modules/@codemirror")) {
            return "codemirror-vendor";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts-vendor";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "radix-vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
});

