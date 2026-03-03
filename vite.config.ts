import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/visual/**', 'node_modules/**', 'dist/**']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projectile: resolve(__dirname, 'src/pages/projectile.html'),
        legacy2d: resolve(__dirname, 'src/pages/legacy-2d.html')
      }
    }
  }
});
