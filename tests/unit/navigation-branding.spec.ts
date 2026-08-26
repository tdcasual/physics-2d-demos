import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const htmlEntrypoints = [
  'index.html',
  'src/pages/projectile.html',
  'src/pages/chase-meet.html',
  'src/pages/field-lines.html',
  'src/pages/electrification.html',
  'src/pages/emf-analogy.html',
  'src/pages/vt-integral.html'
] as const;

describe('navigation branding', () => {
  it('uses subject-neutral title text', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html.includes('物理实验室')).toBe(true);
  });

  it('declares a shared favicon on all html entrypoints', () => {
    expect(existsSync(resolve(process.cwd(), 'public/favicon.svg'))).toBe(true);
    for (const file of htmlEntrypoints) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html, file).toContain('rel="icon"');
      expect(html, file).toContain('href="/favicon.svg"');
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
