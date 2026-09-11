import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const singleFileBuild = process.env.VITE_SINGLE_FILE === "true";

// Configuración compatible con Vite 8 / Rolldown en Vercel.
// No se fuerza manualChunks porque en esta versión puede romper el build.
// La optimización de velocidad se mantiene con carga diferida de pantallas,
// caché de servicios, service worker, compresión backend e índices SQL.
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singleFileBuild ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: !singleFileBuild,
    chunkSizeWarningLimit: 1200,
  },
});
