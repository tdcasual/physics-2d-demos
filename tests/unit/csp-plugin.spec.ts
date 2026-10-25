import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSP_POLICY, injectCsp } from '../../scripts/vite-plugin-csp';
import { renderScenePageHtml } from '../../scripts/vite-plugin-scene-pages';

const root = process.cwd();

describe('csp plugin', () => {
  it('injects the policy right after <meta charset> on scene pages', () => {
    const html = injectCsp(renderScenePageHtml(root, 'projectile'));
    expect(html).toMatch(
      /<meta charset="UTF-8" \/>\n {4}<meta http-equiv="Content-Security-Policy"/
    );
    expect(html).toContain(`content="${CSP_POLICY};"`);
  });

  it('is idempotent', () => {
    const once = injectCsp(renderScenePageHtml(root, 'projectile'));
    expect(injectCsp(once)).toBe(once);
  });

  it('keeps index.html free of a hand-written copy (single source)', () => {
    const index = readFileSync('index.html', 'utf8');
    expect(index).not.toContain('Content-Security-Policy');
  });

  it('throws when the injection anchor is missing', () => {
    expect(() => injectCsp('<html><head></head></html>')).toThrow(/charset/);
  });
});
