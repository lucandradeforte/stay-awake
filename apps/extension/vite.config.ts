import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist', emptyOutDir: true, sourcemap: false,
    rollupOptions: {
      input: { popup: resolve(projectDir, 'popup.html'), workspace: resolve(projectDir, 'workspace.html'), background: resolve(projectDir, 'src/background/index.ts') },
      output: {
        entryFileNames: chunk => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
