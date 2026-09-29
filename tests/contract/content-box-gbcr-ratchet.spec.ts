/**
 * B23 同构 contentBoxSize / sizeGraphCanvasToHost 内 GBCR 棘轮
 *
 * AST 扫描 `src/scenes/<id>/scene.view.ts` 与该场景 `renderer/` 下，
 * 名为 `contentBoxSize` / `sizeGraphCanvasToHost`（含内联形态）的函数体内
 * 对 `getBoundingClientRect` 的 CallExpression。
 *
 * 冻结 11 场景：B23 八员 + B17 已审阅三员（不修，禁止当新债）。
 * 匹配集 === 冻结集（外加即红）；集合内每个 id 必须仍被扫描命中（防假冻结）。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');

const TARGET_FNS = new Set(['contentBoxSize', 'sizeGraphCanvasToHost']);

/** B23 八员：同构 contentBoxSize，当前无 panzoom 路径。 */
const FROZEN_B23 = [
  'emf-internal-resistance',
  'impulse-momentum',
  'mechanical-energy',
  'oscilloscope',
  'potential-energy-graphs',
  'rod-model',
  'single-loop',
  'internal-energy'
] as const;

/** B17 已审阅，不修，禁止当新债。代码仍在，计入冻结集以免外加即红误伤。 */
const FROZEN_B17_REVIEWED = [
  'block-board',
  'variable-work',
  'accel-force'
] as const;

const FROZEN_CONTENT_BOX_GBCR = [
  ...FROZEN_B23,
  ...FROZEN_B17_REVIEWED
] as const;

type GbcrHit = { id: string; file: string; line: number; fn: string };

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter(
      (name) =>
        statSync(join(SCENES_DIR, name)).isDirectory() &&
        existsSync(join(SCENES_DIR, name, 'scene.meta.ts'))
    )
    .sort();
}

function collectViewAndRendererFiles(id: string): string[] {
  const files: string[] = [];
  const view = join(SCENES_DIR, id, 'scene.view.ts');
  if (existsSync(view)) files.push(view);
  const rendererDir = join(SCENES_DIR, id, 'renderer');
  if (existsSync(rendererDir) && statSync(rendererDir).isDirectory()) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) files.push(full);
      }
    };
    walk(rendererDir);
  }
  return files;
}

function namedFunctionName(node: ts.Node): string | null {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isFunctionExpression(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
    if (ts.isPropertyAssignment(parent)) {
      const name = parent.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
    }
  }
  return null;
}

function enclosingTargetFn(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    const name = namedFunctionName(current);
    if (name && TARGET_FNS.has(name)) return name;
    current = current.parent;
  }
  return null;
}

function isGetBoundingClientRectCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expression = node.expression;
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === 'getBoundingClientRect'
  );
}

function scanSource(
  fileName: string,
  source: string
): Array<Omit<GbcrHit, 'id'>> {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const hits: Array<Omit<GbcrHit, 'id'>> = [];
  const visit = (node: ts.Node): void => {
    if (isGetBoundingClientRectCall(node)) {
      const fn = enclosingTargetFn(node);
      if (fn) {
        const position = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        );
        hits.push({
          file: fileName,
          line: position.line + 1,
          fn
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

function scanScene(id: string): GbcrHit[] {
  const hits: GbcrHit[] = [];
  for (const abs of collectViewAndRendererFiles(id)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    const source = readFileSync(abs, 'utf8');
    for (const hit of scanSource(rel, source)) {
      hits.push({ id, ...hit });
    }
  }
  return hits;
}

function scanAllScenes(): Map<string, GbcrHit[]> {
  const byId = new Map<string, GbcrHit[]>();
  for (const id of listSceneIds()) {
    const hits = scanScene(id);
    if (hits.length > 0) byId.set(id, hits);
  }
  return byId;
}

const ISOMORPHIC_FIXTURE = `
function contentBoxSize(host: HTMLElement): { width: number; height: number } {
  const rect = host.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}
export function sizeGraphCanvasToHost(canvas: HTMLCanvasElement): number {
  const host = canvas.parentElement;
  if (host) {
    const box = contentBoxSize(host);
    return box.width;
  }
  const rect = canvas.getBoundingClientRect();
  return rect.width;
}
`;

const POINTER_ORIGIN_FIXTURE = `
export function onPointer(el: HTMLElement, event: PointerEvent): number {
  const rect = el.getBoundingClientRect();
  return event.clientX - rect.left;
}
`;

describe('content-box GBCR ratchet (B23)', () => {
  const byId = scanAllScenes();
  const matched: string[] = [...byId.keys()].sort();
  const frozen: string[] = [...FROZEN_CONTENT_BOX_GBCR].sort();

  it('freeze list contains only discovered scene ids', () => {
    const sceneIds = new Set(listSceneIds());
    const unknown = frozen.filter((id) => !sceneIds.has(id));
    expect(unknown, `冻结集含未知场景：${unknown.join(', ')}`).toEqual([]);
  });

  it('matched scene set equals the frozen 11-id set', () => {
    expect(
      matched,
      `contentBoxSize/sizeGraphCanvasToHost 内 GBCR 场景必须等于冻结集。多余=${matched
        .filter((id) => !frozen.includes(id))
        .join(
          ', '
        )}；缺失=${frozen.filter((id) => !matched.includes(id)).join(', ')}`
    ).toEqual(frozen);
  });

  it.each([...FROZEN_CONTENT_BOX_GBCR])(
    '%s is still hit by the scanner (no false freeze)',
    (id) => {
      const hits = byId.get(id) ?? [];
      expect(
        hits.length,
        `冻结场景 "${id}" 扫描 0 命中：从冻结集删除，或恢复同构函数体内 GBCR`
      ).toBeGreaterThan(0);
    }
  );

  it('B17 reviewed trio stays frozen as reviewed-no-fix, not new debt', () => {
    expect([...FROZEN_B17_REVIEWED]).toEqual([
      'block-board',
      'variable-work',
      'accel-force'
    ]);
    for (const id of FROZEN_B17_REVIEWED) {
      expect(FROZEN_CONTENT_BOX_GBCR.includes(id)).toBe(true);
    }
  });

  it('flags isomorphic contentBoxSize GBCR outside the freeze set (fixture)', () => {
    const hits = scanSource(
      'src/scenes/fixture-probe/scene.view.ts',
      ISOMORPHIC_FIXTURE
    );
    expect(
      hits.length,
      '集外新增同构 contentBoxSize/sizeGraphCanvasToHost+GBCR 必须被扫描命中'
    ).toBeGreaterThan(0);
    expect(hits.some((h) => h.fn === 'contentBoxSize')).toBe(true);
    expect(hits.some((h) => h.fn === 'sizeGraphCanvasToHost')).toBe(true);
    const combined = [...new Set([...matched, 'fixture-probe'])].sort();
    expect(combined).not.toEqual(frozen);
  });

  it('ignores getBoundingClientRect outside the named functions (fixture)', () => {
    const hits = scanSource(
      'src/scenes/fixture-probe/scene.view.ts',
      POINTER_ORIGIN_FIXTURE
    );
    expect(hits).toEqual([]);
  });
});
