import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@core': path.resolve(process.cwd(), './src/core'),
      '@objects': path.resolve(process.cwd(), './src/objects'),
      '@physics': path.resolve(process.cwd(), './src/physics'),
      '@ui': path.resolve(process.cwd(), './src/ui'),
      '@utils': path.resolve(process.cwd(), './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
      },
    },
  },
});