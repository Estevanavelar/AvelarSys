import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }

          if (id.includes("node_modules/@tanstack") || id.includes("node_modules/@trpc") || id.includes("node_modules/superjson")) {
            return "vendor-trpc-query";
          }

          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }

          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) {
            return "vendor-charts";
          }

          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "vendor-maps";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    allowedHosts: true
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    allowedHosts: true
  }
});
