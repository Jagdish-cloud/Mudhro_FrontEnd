import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    base: '/client-portal/',     // important: assets and index under /client-portal
  server: {
    port: 5174, // Different port from main app
    host: true,
  },
   resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
  },
});
