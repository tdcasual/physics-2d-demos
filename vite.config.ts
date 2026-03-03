import { resolve } from 'node:path';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'copy-legacy-animations',
      closeBundle() {
        const src = resolve(__dirname, 'animations');
        const dest = resolve(__dirname, 'dist/animations');
        if (!existsSync(src)) return;
        rmSync(dest, { recursive: true, force: true });
        cpSync(src, dest, {
          recursive: true,
          filter: (path) => !path.endsWith('.DS_Store')
        });
      }
    }
  ],
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
        legacy2d: resolve(__dirname, 'src/pages/legacy-2d.html')
      }
    }
  }
});
