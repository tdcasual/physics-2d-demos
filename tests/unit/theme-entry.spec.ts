import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('theme entry architecture', () => {
  it('keeps one shell-level theme入口 and modern pages use shell theme toggle', () => {
    const shell = read('src/app/layouts/_shared/split-helpers.ts');
    const pages = [
      read('src/scenes/projectile/page.ts'),
      read('src/scenes/chase-meet/page.ts'),
      read('src/scenes/field-lines/page.ts'),
      read('src/scenes/emf-analogy/page.ts'),
      read('src/scenes/electrification/page.ts'),
      read('src/scenes/vt-integral/page.ts')
    ];

    expect(shell).toContain('shell-theme-toggle');
    for (const page of pages) {
      const hasInlineThemeToggle =
        page.includes('onThemeToggle') && page.includes('shell.themeButton');
      const usesBootstrapper = page.includes('bootScenePage');
      expect(hasInlineThemeToggle || usesBootstrapper).toBe(true);
      expect(page.includes('themeToggle')).toBe(false);
    }
  });
});
