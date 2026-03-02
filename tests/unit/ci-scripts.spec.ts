import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ci scripts and workflow', () => {
  it('contains required package scripts and ci workflow', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.lint).toBeTypeOf('string');
    expect(pkg.scripts?.test).toBeTypeOf('string');
    expect(pkg.scripts?.['test:visual']).toBeTypeOf('string');
    expect(pkg.scripts?.build).toBeTypeOf('string');

    expect(existsSync('.github/workflows/ci.yml')).toBe(true);
  });
});
