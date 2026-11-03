import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// O HTML editável fica separado do HTML compilado servido pelo GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: { input: resolve(process.cwd(), 'index.dev.html') }
  }
});
