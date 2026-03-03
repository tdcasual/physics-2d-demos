import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('navigation branding', () => {
  it('uses subject-neutral title text', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html.includes('Physics Animations')).toBe(false);
    expect(html.includes('Teaching Animations')).toBe(true);
  });
});
