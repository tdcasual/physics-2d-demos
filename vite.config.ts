import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { build as buildWithEsbuild } from 'esbuild';
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

function isolateCatalogSceneDependencies(): Plugin {
  return {
    name: 'isolate-catalog-scene-dependencies',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (
        !importer?.endsWith('/scene.meta.ts?catalog') ||
        source !== './scene.sim'
      ) {
        return null;
      }

      const resolved = await this.resolve(
        source,
        importer.slice(0, -'?catalog'.length),
        { skipSelf: true }
      );
      return resolved ? `${resolved.id}?catalog` : null;
    }
  };
}

function bundleDevSceneRegistry(): Plugin {
  const registryPath = resolve(__dirname, 'src/catalog/scene-registry.ts');
  const scenesDir = resolve(__dirname, 'src/scenes');

  return {
    name: 'bundle-dev-scene-registry',
    apply: 'serve',
    enforce: 'pre',
    async load(id) {
      if (process.env.VITEST || id.split('?')[0] !== registryPath) {
        return null;
      }

      const sceneIds = readdirSync(scenesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
      const imports = sceneIds.map(
        (sceneId, index) =>
          `import * as sceneMeta${index} from ${JSON.stringify(
            resolve(scenesDir, sceneId, 'scene.meta.ts')
          )};`
      );
      const moduleEntries = sceneIds.map(
        (sceneId, index) =>
          `${JSON.stringify(`/src/scenes/${sceneId}/scene.meta.ts`)}: sceneMeta${index}`
      );
      const source = readFileSync(registryPath, 'utf8');
      const globStart = source.indexOf('const modules = import.meta.glob');
      const globEnd = source.indexOf(';\n\nfunction extractMeta', globStart);

      if (globStart < 0 || globEnd < 0) {
        throw new Error('Unable to locate the scene registry glob.');
      }

      const bundledSource = [
        ...imports,
        source.slice(0, globStart),
        `const modules = {${moduleEntries.join(',')}} as Record<string, Record<string, unknown>>`,
        source.slice(globEnd + 1)
      ].join('\n');
      const result = await buildWithEsbuild({
        absWorkingDir: __dirname,
        bundle: true,
        format: 'esm',
        metafile: true,
        platform: 'browser',
        stdin: {
          contents: bundledSource,
          loader: 'ts',
          // The generated source keeps scene-registry.ts imports intact. Its
          // relative imports therefore resolve from src/catalog, not repo root.
          resolveDir: resolve(__dirname, 'src/catalog'),
          sourcefile: registryPath
        },
        target: 'es2022',
        write: false
      });

      for (const input of Object.keys(result.metafile.inputs)) {
        this.addWatchFile(resolve(__dirname, input));
      }

      return result.outputFiles[0]?.text ?? null;
    }
  };
}

export default defineConfig({
  plugins: [
    themeNoFlash(),
    scenePages(__dirname),
    isolateCatalogSceneDependencies(),
    bundleDevSceneRegistry(),
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
  resolve: {
    // Vitest + @testing-library/react 必须走真 React；生产/dev 才 alias Preact。
    alias: process.env.VITEST
      ? {}
      : {
          react: 'preact/compat',
          'react-dom': 'preact/compat',
          'react-dom/client': 'preact/compat',
          'react/jsx-runtime': 'preact/jsx-runtime',
          'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
          'react-dom/test-utils': 'preact/test-utils'
        }
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
      // Vitest 4 的 V8 AST 映射比 3.2 更准确；2026-10-07 重测实绩
      // (lines/functions/branches/statements) = 89.32/86.90/71.44/87.75。
      // 棘轮阈值 = 新实绩 − 2 个百分点；覆盖率滑坡仍会直接失败。
      thresholds: {
        lines: 87.3,
        functions: 84.9,
        branches: 69.4,
        statements: 85.7
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 200,
    // 目标浏览器均支持 modulepreload（Safari 17+），省掉 polyfill 请求。
    // 双缝仪器仅步骤 6 动态 import：不要把仪器 chunk 算进首包。
    modulePreload: {
      polyfill: false,
      resolveDependencies(filename, deps) {
        // Panel + capability runtime is dynamically imported. Never
        // modulepreload it: opt-in pages already pay for the engine via
        // data-task, and the panel grew past the scene-entry JS budget.
        const withoutRuntime = deps.filter(
          (dep) => !dep.includes('data-workspace-runtime')
        );
        const withoutDataWorkspace = withoutRuntime.filter(
          (dep) => !dep.includes('data-workspace')
        );
        if (!filename.includes('double-slit')) return withoutDataWorkspace;
        return withoutRuntime.filter(
          (dep) =>
            !dep.includes('instrument-interference-vernier-caliper') &&
            !dep.includes('instrument-micrometer-eyepiece') &&
            !dep.includes('instruments-core')
        );
      }
    },
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
          // Engine is statically imported by opt-in scene data-task modules.
          // Panel + capability stay on the lazy import so they are not
          // forced into the same preloaded chunk as the engine.
          // data-workspace-declarations.ts / data-workspace-lazy.ts stay
          // in the layouts chunk (their filenames do not match this).
          // 目录前缀规则（debt-ledger A4：data-workspace 相关模块已
          // 目录化，不再按文件名特例匹配）
          if (id.includes('/src/platform/data-workspace/')) {
            return 'data-workspace';
          }
          if (
            id.includes('/src/app/layouts/capabilities/data-workspace/') ||
            id.includes('/src/ui/components/data-workspace-panel/')
          ) {
            return 'data-workspace-runtime';
          }
          // Vendor chunk: React ecosystem
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/preact') ||
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
          // 必须排除在 manualChunks 外才能成为独立异步 chunk）。
          // layout-switch-runtime and capability implementations are
          // dynamically imported so the first-paint entry graph stays
          // inside the 190 kB scene budget.
          if (
            id.includes('/src/app/layouts/') &&
            !id.includes('/src/app/layouts/layouts/') &&
            !id.includes('/layout-switch-runtime') &&
            !id.includes('/src/app/layouts/capabilities/')
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
          // The catalog query creates build-only module instances so scene
          // pages can keep their own metadata without preloading this chunk.
          if (
            /\/src\/scenes\/[^/]+\/scene\.(?:meta|sim)\.ts\?catalog$/.test(id)
          ) {
            return 'scene-registry';
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
