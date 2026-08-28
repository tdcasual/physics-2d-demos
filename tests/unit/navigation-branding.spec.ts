import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listSceneIds,
  renderScenePageHtml
} from '../../scripts/vite-plugin-scene-pages';

// 真实 HTML 入口：首页 + src/pages/ 下的 utility 页（场景页由
// vite-plugin-scene-pages 虚拟生成，单独断言其模板）
const realEntrypoints = [
  'index.html',
  ...readdirSync(resolve(process.cwd(), 'src/pages'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `src/pages/${f}`)
] as const;

describe('navigation branding', () => {
  it('uses subject-neutral title text', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html.includes('物理实验室')).toBe(true);
  });

  it('declares a shared favicon on all html entrypoints', () => {
    expect(existsSync(resolve(process.cwd(), 'public/favicon.svg'))).toBe(true);
    for (const file of realEntrypoints) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html, file).toContain('rel="icon"');
      expect(html, file).toContain('href="/favicon.svg"');
    }
    for (const sceneId of listSceneIds(process.cwd())) {
      const html = renderScenePageHtml(process.cwd(), sceneId);
      expect(html, sceneId).toContain('rel="icon"');
      expect(html, sceneId).toContain('href="/favicon.svg"');
    }
  });

  it('keeps the navigation page aligned with the shared typography tokens', () => {
    const tokens = readFileSync(
      resolve(process.cwd(), 'src/styles/design-tokens.css'),
      'utf8'
    );
    const globalCss = readFileSync(
      resolve(process.cwd(), 'src/styles/global.css'),
      'utf8'
    );
    const homeCss = readFileSync(
      resolve(process.cwd(), 'src/styles/app/home.css'),
      'utf8'
    );

    expect(tokens).toContain("'Noto Sans SC'");
    expect(tokens).toContain("'PingFang SC'");
    expect(tokens).not.toContain("'Satoshi'");
    expect(tokens).not.toContain("'Clash Display'");
    expect(globalCss).toContain('font-family: var(--font-body);');
    expect(homeCss).toContain('font-family: var(--font-display);');
  });
});
