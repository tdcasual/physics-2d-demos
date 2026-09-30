import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
        'pnpm check:audit',
        'pnpm lint',
        'pnpm format:check',
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
        'pnpm check:audit',
        'pnpm lint',
        'pnpm format:check',
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

  it('keeps linux visual PNG SoT on the ubuntu:24.04 container script', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    const script = readFileSync('scripts/visual-linux-container.sh', 'utf8');
    const owners = readFileSync('.github/CODEOWNERS', 'utf8');
    const spec = readFileSync('tests/visual/visual-regression.spec.ts', 'utf8');

    expect(ci).toContain('./scripts/visual-linux-container.sh');
    expect(ci).toContain('./scripts/visual-linux-container.sh update');
    expect(owners).toContain('scripts/visual-linux-container.sh');

    expect(script).toMatch(/su builder[\s\S]*export VISUAL_LINUX_AUTHORITY=1/);
    expect(script).toContain('PLAYWRIGHT_JSON_OUTPUT_FILE');
    expect(script).toContain('function walk(s)');
    expect(script).toContain('s.specs');
    expect(script).toContain('s.suites');
    expect(script).toContain('/^(desktop|mobile) /');
    expect(script).toContain('canary.ok !== true');
    expect(script).toContain('if (!process.env.VISUAL_GREP)');
    expect(script).toContain('r.status === "skipped"');
    expect(script).toContain('process.exit(1)');
    expect(script).toContain('--shm-size=1g');
    expect(script).not.toContain('CI-parity');
    expect(script).not.toContain('与 CI 同构');

    const canaryIdx = spec.indexOf(
      'linux PNG authority env is fail-closed in the container'
    );
    const coverageIdx = spec.indexOf(
      'visual baseline coverage accounts for every discovered scene'
    );
    const dynamicIdx = spec.indexOf(
      'dynamic screenshot allowlist only contains discovered scenes'
    );
    const describeIdx = spec.indexOf("test.describe('scene screenshots'");
    const skipIdx = spec.indexOf('test.skip(');
    expect(canaryIdx).toBeGreaterThan(-1);
    expect(coverageIdx).toBeGreaterThan(-1);
    expect(dynamicIdx).toBeGreaterThan(-1);
    expect(describeIdx).toBeGreaterThan(-1);
    expect(skipIdx).toBeGreaterThan(-1);
    expect(canaryIdx).toBeLessThan(describeIdx);
    expect(coverageIdx).toBeLessThan(describeIdx);
    expect(dynamicIdx).toBeLessThan(describeIdx);
    expect(skipIdx).toBeGreaterThan(describeIdx);
    expect(spec.indexOf('for (const scene of SCENES)')).toBeGreaterThan(
      describeIdx
    );
    expect(script).toContain('baseline-coverage.json');
    expect(script).toContain('screenshotSpecCount');
    expect(script).toContain('--grep');
    expect(script).toContain('--output');
    expect(script).toContain('/tmp/visual-grep.dat');
    expect(script).toContain('args.push("--grep", grep)');
    expect(script).toContain('visual-filtered.log');
    expect(script).not.toContain('export VISUAL_GREP=\\"');
    expect(script).toContain('cp -a /src/. /work/');
    expect(script).not.toContain('rm -rf /work\n');
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
    const sceneCount = readdirSync(join(process.cwd(), 'src/scenes'), {
      withFileTypes: true
    }).filter((entry) => entry.isDirectory()).length;
    const instrumentManifest = readFileSync(
      join(process.cwd(), 'src/instruments/_manifest/manifest.ts'),
      'utf8'
    );
    const instrumentCount = [...instrumentManifest.matchAll(/id:\s*'([^']+)'/g)]
      .length;

    expect(pkg.name).toBe('physics-2d-demos');
    expect(readme).toContain(`${sceneCount} 个交互式物理教学场景`);
    expect(readme).toContain(`${instrumentCount} 个仪器组件`);
    expect(readme).not.toContain('TransportBridge');
    expect(agents).toContain(`${sceneCount} 个交互式 2D 物理场景`);
    expect(agents).toContain(`${instrumentCount} 个可按需加载的仪器组件`);
  });

  it('keeps global fonts local-first without remote CSS imports', () => {
    const globalCss = readFileSync('src/styles/global.css', 'utf8');

    expect(globalCss).not.toContain('api.fontshare.com');
    expect(globalCss).not.toContain("@import url('https://");
  });
});
