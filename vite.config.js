import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 8000, assetsInlineLimit: 0 },
  server: { port: 5173 },
});
