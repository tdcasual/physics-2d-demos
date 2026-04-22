import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { analyzer } from 'vite-bundle-analyzer';

/**
 * 自动扫描 src/pages/*.html 作为构建入口。
 * 新增场景页面时无需再手动修改此配置。
 */
function discoverPageEntries(pagesDir: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const file of readdirSync(pagesDir)) {
    if (file.endsWith('.html')) {
      const name = file.replace(/\.html$/, '');
      entries[name] = resolve(pagesDir, file);
    }
  }

  return entries;
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    process.env.ANALYZE === 'true' &&
      analyzer({
        analyzerMode: 'static',
        openAnalyzer: true
      })
  ].filter(Boolean),
  server: {
    host: true,
    port: 5177
  },
  preview: {
    host: true,
    port: 5177
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup.ts'],
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/unit/**/*.spec.tsx',
      'tests/contract/**/*.spec.ts'
    ],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'scripts/**',
        'src/**/*.d.ts',
        '**/*.config.*',
        'src/scenes/*/page.ts',
        'src/scenes/*/scene.view.ts',
        'src/scenes/*/scene.meta.ts'
      ],
      thresholds: {
        lines: 25,
        functions: 50,
        branches: 40,
        statements: 25
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...discoverPageEntries(resolve(__dirname, 'src/pages'))
      },
      output: {
        manualChunks(id) {
          // Vendor chunk: React ecosystem
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor';
          }
          // UI components chunk
          if (id.includes('/src/ui/')) {
            return 'ui';
          }
          // Layout system chunk
          if (id.includes('/src/app/layouts/')) {
            return 'layouts';
          }
          // Core utilities chunk
          if (id.includes('/src/core/') || id.includes('/src/platform/')) {
            return 'core';
          }
          // Scene metadata shared across entries
          if (id.includes('/scene.meta.')) {
            return 'scene-meta';
          }
          // Scene bootstrapper shared across entries
          if (
            id.includes('/scene-bootstrapper.') ||
            id.includes('/scene-listener.')
          ) {
            return 'scene-bootstrapper';
          }
        }
      }
    }
  }
});
