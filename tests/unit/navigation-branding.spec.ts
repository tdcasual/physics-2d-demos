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
    expect(html.includes('Physics Animations')).toBe(false);
    expect(html.includes('Teaching Animations')).toBe(true);
  });

  it('declares a shared favicon on all html entrypoints', () => {
    expect(existsSync(resolve(process.cwd(), 'public/favicon.svg'))).toBe(true);
    for (const file of htmlEntrypoints) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html, file).toContain('rel="icon"');
      expect(html, file).toContain('href="/favicon.svg"');
    }
  });

  it('keeps the navigation page aligned with the teaching demo typography', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html.includes('Baloo 2')).toBe(false);
    expect(html.includes('Nunito')).toBe(false);
    expect(html.includes('Noto Sans SC')).toBe(true);
  });
});
