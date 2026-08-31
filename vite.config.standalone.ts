/**
 * Standalone build config — exports each scene as a self-contained HTML file.
 *
 * Usage: vite build --config vite.config.standalone.ts
 * Output: dist/standalone/<scene-id>.html
 */

import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { inlineAssets } from './scripts/vite-plugin-inline-assets';
import {
  discoverScenePageEntries,
  scenePages
} from './scripts/vite-plugin-scene-pages';

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
  // 场景页无 React（仅首页使用），standalone 构建不需要 react 插件
  // 场景页 HTML 与主构建一致，由 vite-plugin-scene-pages 虚拟生成
  plugins: [tailwindcss(), scenePages(__dirname), inlineAssets()],
  // 相对 base：产物常经 file:// 打开，绝对路径（/assets/...）会被 CORS 拦截
  base: './',
  build: {
    outDir: 'dist/standalone',
    emptyOutDir: true,
    // 单文件产物：动态 chunk 全部内联，依赖预加载（__vitePreload 的
    // import.meta.url 基准）在 esbuild IIFE 合并后无意义且会抛 Invalid URL
    modulePreload: false,
    // 单文件产物：CSS 全部合并进每页 <link>（由 inlineAssets 内联进 <style>），
    // 避免动态 chunk 关联 CSS 在运行时经 __vitePreload 再插 <link>
    cssCodeSplit: false,
    // No manual chunks — everything gets inlined anyway
    // Let Vite optimize freely for smaller total size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        ...discoverPageEntries(resolve(__dirname, 'src/pages')),
        ...discoverScenePageEntries(__dirname)
      },
      output: {
        // Flatten output so scene HTML files land at the root of dist/standalone/
        // (the inline plugin also handles this, but flat asset paths help)
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
});
