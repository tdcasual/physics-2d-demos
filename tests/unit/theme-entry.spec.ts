import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('theme entry architecture', () => {
  it('keeps one shell-level theme入口 and removes per-scene side toggles', () => {
    const shell = read('src/app/teaching-demo-shell.ts');
    const fieldControls = read('src/app/legacy-field-lines-controls.ts');
    const chaseControls = read('src/app/legacy-chase-meet-controls.ts');
    const legacyFieldLines = read('animations/electromagnetism/模拟电场线.html');
    const legacyChaseMeet = read('animations/mechanics/追击相遇问题.html');
    const legacyEmf = read('animations/electromagnetism/电动势类比动画.html');
    const legacyElectrification = read('animations/electromagnetism/起电方式演示.html');
    const legacyVt = read('animations/mechanics/v-t面积与微元法.html');

    expect(shell).toContain('shell-theme-toggle');
    expect(fieldControls.includes('data-role="theme-toggle"')).toBe(false);
    expect(chaseControls.includes('data-role="theme-toggle"')).toBe(false);
    expect(legacyFieldLines.includes('themeToggle')).toBe(false);
    expect(legacyChaseMeet.includes('themeToggle')).toBe(false);

    expect(legacyFieldLines).toContain('set-theme');
    expect(legacyChaseMeet).toContain('set-theme');
    expect(legacyEmf).toContain('set-theme');
    expect(legacyElectrification).toContain('set-theme');
    expect(legacyVt).toContain('set-theme');
  });
});
