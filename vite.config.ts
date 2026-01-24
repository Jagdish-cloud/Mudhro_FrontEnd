import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "mudhro-frontend-e5a8gbbkc5f8buae.centralindia-01.azurewebsites.net",
      "https://mudhrofrontend-duhqdhfbfahjbjaj.centralindia-01.azurewebsites.net",
      "mudhro.com",
      "www.mudhro.com",
      "https://mudhro.com",
      "https://www.mudhro.com"
    ],
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

