import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = resolve(process.cwd(), 'scripts/esbuild-bundle-chunks.js');

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runBundler(chunks: Record<string, string>, entry: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'esbuild-chunks-'));
  tmpDirs.push(dir);
  const inputFile = join(dir, 'in.json');
  const outputFile = join(dir, 'out.js');
  writeFileSync(inputFile, JSON.stringify({ entry, chunks }));
  execFileSync('node', [scriptPath, inputFile, outputFile], {
    encoding: 'utf8'
  });
  return readFileSync(outputFile, 'utf8');
}

describe('esbuild-bundle-chunks', () => {
  it('bundles virtual chunks into an IIFE', () => {
    const out = runBundler(
      {
        'entry.js': 'import { n } from "./dep.js"; console.log(n);',
        'dep.js': 'export const n = 1;'
      },
      'entry.js'
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/function|\(\)/);
  });

  it('exits non-zero when a specifier is not in the chunk map', () => {
    const dir = mkdtempSync(join(tmpdir(), 'esbuild-chunks-'));
    tmpDirs.push(dir);
    const inputFile = join(dir, 'in.json');
    const outputFile = join(dir, 'out.js');
    writeFileSync(
      inputFile,
      JSON.stringify({
        entry: 'entry.js',
        chunks: {
          'entry.js': 'import "./missing.js"; export const x = 1;'
        }
      })
    );
    expect(() =>
      execFileSync('node', [scriptPath, inputFile, outputFile], {
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'pipe']
      })
    ).toThrow();
  });
});
