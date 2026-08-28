/**
 * src/pages/ 下非场景页（工具页）清单的唯一事实来源。
 *
 * 场景页 HTML 由 scripts/vite-plugin-scene-pages.ts 虚拟生成，src/pages/
 * 下只允许存在本清单内的真实 HTML 文件（scripts/check-scenes.ts 反向检查
 * 会拒绝其他任何真实 HTML）。
 *
 * 列入本清单的页面不需要同名 src/scenes/<id>/ 场景目录。
 */
export const UTILITY_PAGES: ReadonlySet<string> = new Set([
  'index-layout-test',
  'instruments'
]);
