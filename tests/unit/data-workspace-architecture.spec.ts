import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const PANEL_DIR = join(root, 'src/ui/components/data-workspace-panel');

const FORBIDDEN = [
  'x1',
  'x2',
  'deltaX',
  'averageDeltaX',
  'lambda',
  'd·平均Δx',
  '测得波长',
  'Δx = D / n',
  'D = x₂',
  'aDiff',
  'aFit',
  'tapeX',
  '逐差',
  '纸带',
  '计数点',
  '打点计时器',
  'ticker-tape',
  'tickerTape'
];

function collectDirectorySource(dir: string): string {
  const files: string[] = [];
  function walk(current: string): void {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  files.sort();
  return files.map((file) => readFileSync(file, 'utf8')).join('\n');
}

describe('data-workspace panel architecture', () => {
  it('contains no double-slit field ids or formula copy', () => {
    const source = collectDirectorySource(PANEL_DIR);
    for (const token of FORBIDDEN) {
      expect(
        source,
        `panel must not contain ${JSON.stringify(token)}`
      ).not.toContain(token);
    }
    expect(source).toContain('rowFields');
    expect(source).toContain('summaryFields');
    expect(source).toContain('applyDrafts');
    // 图像分析是独立环节：面板无步骤条，入口在悬浮工具条（capability）。
    expect(source).toContain('setChartMode');
    expect(source).not.toContain('1 数据处理');
    expect(source).not.toContain('2 图像分析');
    const capabilitySource = readFileSync(
      join(root, 'src/app/layouts/capabilities/data-workspace/index.ts'),
      'utf8'
    );
    expect(capabilitySource).toContain('图像分析');
    expect(capabilitySource).toContain('进入图像分析环节');
    expect(capabilitySource).not.toContain('请先完成数据处理再进入图像分析');
  });
});

const RUNTIME_MODULES = new Set([
  'src/app/layouts/capabilities/data-workspace',
  'src/app/layouts/capabilities/stage-panzoom',
  'src/ui/components/data-workspace-panel',
  'src/platform/data-workspace',
  'src/scenes/double-slit/data-task',
  'src/scenes/double-slit/wavelength'
]);

const BOUNDARY_FILES = [
  'src/app/layouts/capabilities/index.ts',
  'src/app/layouts/capabilities/data-workspace-declarations.ts',
  'src/app/layouts/capabilities/data-workspace-lazy.ts',
  'src/app/layouts/layouts/split-right/split-right.ts',
  'src/app/layouts/layouts/split-right-graph-bottom/split-right-graph-bottom.ts',
  'src/app/layouts/layouts/lab-stage/lab-stage.ts',
  'src/app/layouts/layouts/mobile-stack/mobile-stack.ts'
];

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function extractStaticImportSpecifiers(source: string): string[] {
  const stripped = stripComments(source);
  const specifiers: string[] = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'"()\n]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?[^'"()\n]*?\s+from\s+['"]([^'"]+)['"]/g
  ];
  for (const pattern of patterns) {
    for (const match of stripped.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }
  return specifiers;
}

function resolveSpecifier(file: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const absolute = resolve(root, dirname(file), specifier);
  const candidates = [
    absolute,
    `${absolute}.ts`,
    `${absolute}.tsx`,
    join(absolute, 'index.ts')
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(root, candidate).split(sep).join('/');
    }
  }
  return relative(root, absolute).split(sep).join('/');
}

function withoutExt(path: string): string {
  return path.replace(/\.(?:ts|tsx|js|mjs)$/, '');
}

/** Directory entries match as a prefix so files inside them cannot bypass. */
function isRuntimeModule(resolved: string): boolean {
  const normalized = withoutExt(resolved);
  for (const prefix of RUNTIME_MODULES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

describe('data-workspace lazy import boundary', () => {
  it('matches runtime modules by directory prefix', () => {
    expect(
      isRuntimeModule('src/ui/components/data-workspace-panel/index.ts')
    ).toBe(true);
    expect(
      isRuntimeModule('src/ui/components/data-workspace-panel/table-render.ts')
    ).toBe(true);
    expect(isRuntimeModule('src/platform/data-workspace/session-ops.ts')).toBe(
      true
    );
    expect(isRuntimeModule('src/scenes/double-slit/data-task.ts')).toBe(true);
    expect(
      isRuntimeModule('src/app/layouts/capabilities/stage-panzoom.ts')
    ).toBe(true);
    expect(
      isRuntimeModule(
        'src/app/layouts/capabilities/data-workspace-declarations.ts'
      )
    ).toBe(false);
    expect(
      isRuntimeModule('src/app/layouts/capabilities/stage-panzoom-controls.ts')
    ).toBe(false);
  });

  it('keeps runtime modules out of capability index and layout static imports', () => {
    for (const file of BOUNDARY_FILES) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const specifier of extractStaticImportSpecifiers(source)) {
        const resolved = resolveSpecifier(file, specifier);
        if (!resolved) continue;
        expect(
          isRuntimeModule(resolved),
          `${file} must not statically import ${resolved}`
        ).toBe(false);
      }
    }
  });
});
