/**
 * src/pages/ 下非场景页（工具页）清单的唯一事实来源。
 *
 * 共享方（修改时请同步检查）：
 * - scripts/check-scenes.ts      — 反向检查孤儿 HTML 时排除这些页面
 * - tests/visual/scene-pages.ts  — 视觉测试遍历场景页时排除这些页面
 *
 * 列入本清单的页面不需要同名 src/scenes/<id>/ 场景目录。
 */
export const UTILITY_PAGES: ReadonlySet<string> = new Set([
  'index-layout-test',
  'instruments'
]);
