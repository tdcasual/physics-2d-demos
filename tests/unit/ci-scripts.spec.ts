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
    expect(pkg.scripts?.['check:layouts']).toBe('tsx scripts/check-layouts.ts');
    expect(pkg.scripts?.['check:bundle']).toBe(
      'tsx scripts/check-bundle-budget.ts'
    );
    expect(pkg.scripts?.['check:scaffold']).toBe(
      'tsx scripts/check-scaffold.ts'
    );
    expect(pkg.scripts?.['verify:scene']).toBe('tsx scripts/verify-scene.ts');
    expect(pkg.scripts?.['quality:core']).toBe(
      [
        'pnpm check:scenes',
        'pnpm check:scaffold',
        'pnpm check:layouts',
        'pnpm check:circular',
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test:coverage',
        'pnpm build',
        'pnpm check:bundle'
      ].join(' && ')
    );
    expect(pkg.scripts?.['quality:full']).toBe(
      [
        'pnpm check:scenes',
        'pnpm check:scaffold',
        'pnpm check:layouts',
        'pnpm check:circular',
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test:coverage',
        'pnpm build',
        'pnpm check:bundle',
        'PLAYWRIGHT_SKIP_BUILD=1 pnpm test:e2e',
        'PLAYWRIGHT_SKIP_BUILD=1 pnpm test:visual'
      ].join(' && ')
    );

    expect(existsSync('.github/workflows/ci.yml')).toBe(true);
    expect(existsSync('scripts/check-scenes.ts')).toBe(true);
    expect(existsSync('scripts/check-scaffold.ts')).toBe(true);
    expect(existsSync('scripts/verify-scene.ts')).toBe(true);
    expect(existsSync('scripts/check-layouts.ts')).toBe(true);
    expect(existsSync('scripts/check-bundle-budget.ts')).toBe(true);

    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toContain('pnpm check:scenes');
    expect(ci).toContain('pnpm check:scaffold');
    expect(ci).toContain('pnpm check:layouts');
    expect(ci).toContain('pnpm check:bundle');
    expect(ci).toContain('pnpm check:circular');
    expect(ci).toContain('PLAYWRIGHT_SKIP_BUILD=1 pnpm test:e2e');
    expect(ci).toContain('PLAYWRIGHT_SKIP_BUILD=1 pnpm test:visual');
    expect(ci).not.toContain('pnpm generate:index');
    expect(ci).not.toContain('run: pnpm test\n');
  });

  it('keeps coverage reporters aligned with codecov upload', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');

    expect(viteConfig).toContain("reporter: ['text', 'html', 'json', 'lcov']");
    expect(ci).toContain('files: ./coverage/lcov.info');
  });

  it('keeps package and docs aligned with the current scene inventory', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      name?: string;
    };
    const readme = readFileSync('README.md', 'utf8');
    const agents = readFileSync('AGENTS.md', 'utf8');

    expect(pkg.name).toBe('physics-2d-demos');
    expect(readme).not.toContain('8 个交互式物理教学场景');
    expect(agents).not.toContain('包含 8 个交互式 2D 物理场景');
    expect(agents).not.toContain('scenes/        — 8 个物理场景');
  });

  it('keeps global fonts local-first without remote CSS imports', () => {
    const globalCss = readFileSync('src/styles/global.css', 'utf8');

    expect(globalCss).not.toContain('api.fontshare.com');
    expect(globalCss).not.toContain("@import url('https://");
  });
});
