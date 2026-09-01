import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findModuleScripts,
  inlineAssets,
  inlineStandaloneChrome
} from '../../scripts/vite-plugin-inline-assets';

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('findModuleScripts', () => {
  it('collects every type=module src script, not just the first', () => {
    const html = `
      <script type="module" src="./assets/a.js"></script>
      <script type="module" crossorigin src="../assets/b.js"></script>
    `;
    const found = findModuleScripts(html);
    expect(found).toHaveLength(2);
    expect(found[0]?.src).toBe('./assets/a.js');
    expect(found[1]?.src).toBe('../assets/b.js');
  });
});

describe('inlineStandaloneChrome', () => {
  it('inlines favicon as a data URI and drops the manifest link', () => {
    const html = `
      <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
      <link rel="manifest" href="/manifest.json" />
    `;
    const out = inlineStandaloneChrome(
      html,
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    );
    expect(out).toMatch(/href="data:image\/svg\+xml;base64,/);
    expect(out).not.toContain('rel="manifest"');
    expect(out).toContain('standalone: manifest omitted');
  });
});

describe('inlineAssets writeBundle failure path', () => {
  it('calls this.error when a module script cannot be inlined', () => {
    const dir = mkdtempSync(join(tmpdir(), 'inline-assets-'));
    tmpDirs.push(dir);
    writeFileSync(
      join(dir, 'broken.html'),
      `<!doctype html><script type="module" src="./assets/missing.js"></script>`
    );

    const plugin = inlineAssets();
    const hook = plugin.writeBundle;
    expect(typeof hook).toBe('function');
    const error = vi.fn((msg: string): never => {
      throw new Error(String(msg));
    });

    const run = hook as (
      this: { error: (m: string) => never },
      opts: { dir: string },
      bundle: Record<string, { type: string }>
    ) => void;

    expect(() =>
      run.call({ error }, { dir }, { 'broken.html': { type: 'asset' } })
    ).toThrow(/Failed to inline/);
    expect(error).toHaveBeenCalled();
    expect(existsSync(join(dir, 'broken.html'))).toBe(true);
  });
});
