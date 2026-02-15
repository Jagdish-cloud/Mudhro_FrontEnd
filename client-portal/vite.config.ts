import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    base: '/client-portal/',     // important: assets and index under /client-portal
  server: {
    port: 5174, // Different port from main app
    host: "::",
        allowedHosts: [
      "mudhro-frontend-e5a8gbbkc5f8buae.centralindia-01.azurewebsites.net/client-portal/",
      "https://mudhrofrontend-duhqdhfbfahjbjaj.centralindia-01.azurewebsites.net/client-portal/",
      "mudhro.com/client-portal/",
      "www.mudhro.com/client-portal/",
      "https://mudhro.com/client-portal/",
      "https://www.mudhro.com/client-portal/"
    ],
  },
   resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
  },
});
