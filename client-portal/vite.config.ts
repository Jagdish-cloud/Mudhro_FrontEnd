import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    base: '/client-portal/',     // important: assets and index under /client-portal
  server: {
    port: 5174, // Different port from main app
    host: true,
  },
  build: {
    outDir: 'dist',
  },
});
