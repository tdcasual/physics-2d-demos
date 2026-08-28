import { readdirSync } from 'node:fs';
import { join } from 'node:path';
// UTILITY_PAGES 的唯一事实来源在 scripts/utility-pages.ts（check-scenes 反向检查共用）
import { UTILITY_PAGES } from '../../scripts/utility-pages';

/** Discover scene entry pages without maintaining a second scene registry. */
export const sceneIds = readdirSync(join(process.cwd(), 'src/pages'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replace(/\.html$/, ''))
  .filter((id) => !UTILITY_PAGES.has(id))
  .sort();

export function scenePage(id: string, query = ''): string {
  return `/src/pages/${id}.html${query}`;
}
