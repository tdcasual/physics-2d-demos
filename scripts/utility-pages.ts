/**
 * src/pages/ 下非场景页（工具页）清单的唯一事实来源。
 *
 * 场景页 HTML 由 scripts/vite-plugin-scene-pages.ts 虚拟生成，src/pages/
 * 下只允许存在本清单内的真实 HTML 文件（scripts/check-scenes.ts 反向检查
 * 会拒绝其他任何真实 HTML）。
 *
 * 列入本清单的页面不需要同名 src/scenes/<id>/ 场景目录。
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const UTILITY_PAGES: ReadonlySet<string> = new Set([
  'index-layout-test',
  'instruments'
]);

/**
 * 仅供 dev server 使用的工具页：不进入生产构建入口（不发布到线上）。
 * dev 下 Vite 直接按路径服务 src/pages/ 真实文件，不受影响。
 */
export const DEV_ONLY_PAGES: ReadonlySet<string> = new Set([
  'index-layout-test'
]);

/**
 * src/pages/*.html 真实文件（工具页）的构建入口；场景页入口由
 * vite-plugin-scene-pages 虚拟生成。DEV_ONLY_PAGES 不进入构建。
 */
export function discoverUtilityPageEntries(
  pagesDir: string
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const file of readdirSync(pagesDir)) {
    if (!file.endsWith('.html')) continue;
    const name = file.replace(/\.html$/, '');
    if (DEV_ONLY_PAGES.has(name)) continue;
    entries[name] = resolve(pagesDir, file);
  }
  return entries;
}
