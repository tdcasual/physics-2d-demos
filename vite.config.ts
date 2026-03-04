import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5177
  },
  preview: {
    host: true,
    port: 5177
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
        chaseMeet: resolve(__dirname, 'src/pages/chase-meet.html'),
        fieldLines: resolve(__dirname, 'src/pages/field-lines.html'),
        emfAnalogy: resolve(__dirname, 'src/pages/emf-analogy.html'),
        electrification: resolve(__dirname, 'src/pages/electrification.html'),
        vtIntegral: resolve(__dirname, 'src/pages/vt-integral.html')
      }
    }
  }
});
