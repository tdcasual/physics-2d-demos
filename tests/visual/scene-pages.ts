import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 场景页清单从 src/scenes/<id>/scene.meta.ts 反推（与 catalog 自动发现口径一致）。
 * 场景页 HTML 由 vite-plugin-scene-pages 虚拟生成，src/pages/ 下不再有
 * 手抄场景 HTML；非场景页面（工具页）清单见 scripts/utility-pages.ts。
 */
const scenesDir = join(process.cwd(), 'src/scenes');

/** Discover scene entry pages without maintaining a second scene registry. */
export const sceneIds = readdirSync(scenesDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(scenesDir, entry.name, 'scene.meta.ts'))
  )
  .map((entry) => entry.name)
  .sort();

export function scenePage(id: string, query = ''): string {
  return `/src/pages/${id}.html${query}`;
}
