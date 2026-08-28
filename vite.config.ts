import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { analyzer } from 'vite-bundle-analyzer';
import { themeNoFlash } from './scripts/vite-plugin-theme-noflash';
import {
  discoverScenePageEntries,
  scenePages
} from './scripts/vite-plugin-scene-pages';

/**
 * 自动扫描 src/pages/*.html 真实文件作为构建入口（仅工具页；
 * 场景页入口由 vite-plugin-scene-pages 虚拟生成，见
 * discoverScenePageEntries）。新增场景页面时无需再手动修改此配置。
 *
 * 注意：src/pages/index-layout-test.html 是 tests/visual（scene-pages / 布局矩阵等）
 * 在 preview 模式下的测试依赖，有意随构建发布到 dist，做产物清理时请勿删除。
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
    themeNoFlash(),
    scenePages(__dirname),
    tailwindcss(),
    react(),
    process.env.ANALYZE === 'true' &&
      analyzer({
        analyzerMode: 'static',
        openAnalyzer: false
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
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'scripts/**',
        'src/**/*.d.ts',
        '**/*.config.*',
        'src/scenes/*/page.ts',
        // Note: scene.view.ts files are now tested via Canvas mock tests
        'src/scenes/*/scene.meta.ts'
      ],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 70,
        statements: 65
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 200,
    // 目标浏览器均支持 modulepreload（Safari 17+），省掉 polyfill 请求
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...discoverPageEntries(resolve(__dirname, 'src/pages')),
        ...discoverScenePageEntries(__dirname)
      },
      output: {
        manualChunks(id) {
          // Vite preload helper 必须独立成 chunk：布局懒加载（动态
          // import）后该 helper 会随使用者被归入 layouts chunk，
          // 而首页懒加载 ExperimentsSection 同样需要它——不显式
          // 分组时首页会被迫预载整个布局系统。
          if (id.includes('preload-helper')) {
            return 'preload-helper';
          }
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
          // theme-store 同时被首页（React useTheme）与场景页
          // （layouts/container、scene-bootstrapper）引用。不显式分组时
          // Rollup 会把它并入 layouts chunk，导致首页被迫预载整个
          // 布局系统（layouts/ui/core/scene-bootstrapper 及其 CSS）。
          if (id.includes('/src/app/theme-store.')) {
            return 'theme-store';
          }
          // Layout system chunk（仅框架：registry/container/capabilities；
          // 具体布局实现经 registerLazyLayout 动态 import，
          // 必须排除在 manualChunks 外才能成为独立异步 chunk）
          if (
            id.includes('/src/app/layouts/') &&
            !id.includes('/src/app/layouts/layouts/')
          ) {
            return 'layouts';
          }
          // Core utilities chunk
          if (id.includes('/src/core/') || id.includes('/src/platform/')) {
            return 'core';
          }
          // Instrument library infrastructure
          if (id.includes('/src/instruments/_')) {
            return 'instruments-core';
          }
          // Individual instrument chunks — each instrument is its own chunk
          // This enables on-demand loading: only the clicked instrument is fetched
          const instrumentMatch = id.match(/\/src\/instruments\/([^/]+)\//);
          if (instrumentMatch) {
            const instrumentId = instrumentMatch[1];
            if (!instrumentId.startsWith('_')) {
              return `instrument-${instrumentId}`;
            }
          }
          // Scene metadata: one chunk per scene so scene pages only preload
          // their own meta. The home page still gets the full set through the
          // scene-registry aggregation chunk.
          const sceneMetaMatch = id.match(
            /\/src\/scenes\/([^/]+)\/scene\.meta\./
          );
          if (sceneMetaMatch) {
            return `scene-meta-${sceneMetaMatch[1]}`;
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
