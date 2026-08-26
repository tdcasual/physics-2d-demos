import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  injectThemeNoFlash,
  THEME_NOFLASH_SNIPPET,
  themeNoFlash
} from '../../scripts/vite-plugin-theme-noflash';

const minimalHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>demo</title>
  </head>
  <body></body>
</html>
`;

describe('theme-noflash plugin', () => {
  it('keeps the snippet byte-identical to the legacy hand-copied version', () => {
    // 历史手抄版本（19 个 HTML 完全一致）的 md5；改动防闪烁脚本时必须同步
    // src/app/theme-store.ts 的存储格式，并更新此基线。
    const md5 = createHash('md5')
      .update(THEME_NOFLASH_SNIPPET + '\n')
      .digest('hex');
    expect(md5).toBe('7c61206b47cbf5d98bf658aa1ffd3a19');
  });

  it('injects the anti-flash script right after the viewport meta', () => {
    const out = injectThemeNoFlash(minimalHtml);
    expect(out).toContain(THEME_NOFLASH_SNIPPET);
    expect(out.indexOf('name="viewport"')).toBeLessThan(
      out.indexOf('阻止 theme flash')
    );
  });

  it('is idempotent', () => {
    const once = injectThemeNoFlash(minimalHtml);
    expect(injectThemeNoFlash(once)).toBe(once);
  });

  it('throws when the viewport meta is missing', () => {
    expect(() => injectThemeNoFlash('<html><head></head></html>')).toThrow(
      /viewport/
    );
  });

  it('exposes a vite transformIndexHtml handler with pre order', () => {
    const plugin = themeNoFlash();
    expect(plugin.name).toBe('vite-plugin-theme-noflash');
    const transform = plugin.transformIndexHtml as {
      order?: string;
      handler: (html: string) => string;
    };
    expect(transform.order).toBe('pre');
    expect(transform.handler(minimalHtml)).toContain(THEME_NOFLASH_SNIPPET);
  });

  it('is registered in vite.config.ts', () => {
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain('themeNoFlash()');
  });

  it('keeps HTML sources free of hand-copied anti-flash scripts', () => {
    const htmlFiles = [
      'index.html',
      ...readdirSync('src/pages')
        .filter((f) => f.endsWith('.html'))
        .map((f) => join('src/pages', f))
    ];
    for (const file of htmlFiles) {
      expect(readFileSync(file, 'utf8'), file).not.toContain(
        '阻止 theme flash'
      );
    }
  });
});
