import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const UTILITY_PAGES = new Set(['index-layout-test', 'instruments']);

/** Discover scene entry pages without maintaining a second scene registry. */
export const sceneIds = readdirSync(join(process.cwd(), 'src/pages'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replace(/\.html$/, ''))
  .filter((id) => !UTILITY_PAGES.has(id))
  .sort();

export function scenePage(id: string, query = ''): string {
  return `/src/pages/${id}.html${query}`;
}
