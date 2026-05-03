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
    expect(pkg.scripts?.['check:scenes']).toBe('tsx scripts/check-scenes.ts');
    expect(pkg.scripts?.['check:bundle']).toBe(
      'tsx scripts/check-bundle-budget.ts'
    );
    expect(pkg.scripts?.['quality:core']).toBe(
      [
        'pnpm check:scenes',
        'pnpm check:circular',
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test',
        'pnpm build',
        'pnpm check:bundle'
      ].join(' && ')
    );
    expect(pkg.scripts?.['quality:full']).toBe(
      [
        'pnpm check:scenes',
        'pnpm check:circular',
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test',
        'pnpm test:coverage',
        'pnpm build',
        'pnpm check:bundle',
        'pnpm test:e2e',
        'pnpm test:visual'
      ].join(' && ')
    );

    expect(existsSync('.github/workflows/ci.yml')).toBe(true);
    expect(existsSync('scripts/check-scenes.ts')).toBe(true);
    expect(existsSync('scripts/check-bundle-budget.ts')).toBe(true);

    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toContain('pnpm check:scenes');
    expect(ci).toContain('pnpm check:bundle');
    expect(ci).toContain('pnpm check:circular');
    expect(ci).not.toContain('pnpm generate:index');
  });
});
