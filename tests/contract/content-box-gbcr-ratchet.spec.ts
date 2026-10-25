/**
 * B23 图区画布测量收口（原 GBCR 棘轮）
 *
 * 图区尺寸测量（contentBoxSize / sizeGraphCanvasToHost）唯一实现在
 * src/scenes/stage-fit.ts。AST 扫描各场景 scene.view.ts 与 renderer/：
 * 这两个函数名下出现 getBoundingClientRect 即视为本地复刻，必须为零。
 * （共享实现仍以 GBCR 测量，修复点只剩 stage-fit.ts 一处，见其注释。）
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');

const TARGET_FNS = new Set(['contentBoxSize', 'sizeGraphCanvasToHost']);

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

describe('content-box measurement lives only in stage-fit (B23)', () => {
  const byId = scanAllScenes();

  it('no scene re-implements contentBoxSize / sizeGraphCanvasToHost with GBCR', () => {
    const offenders = [...byId.values()]
      .flat()
      .map((hit) => `${hit.file}:${hit.line} (${hit.fn})`);
    expect(
      offenders,
      '图区测量请调用 src/scenes/stage-fit.ts 的 sizeCanvasToHostBox / contentBoxSize'
    ).toEqual([]);
  });

  it('flags a local contentBoxSize GBCR copy (fixture)', () => {
    const hits = scanSource(
      'src/scenes/fixture-probe/scene.view.ts',
      ISOMORPHIC_FIXTURE
    );
    expect(
      hits.length,
      '本地复刻的 contentBoxSize/sizeGraphCanvasToHost+GBCR 必须被扫描命中'
    ).toBeGreaterThan(0);
    expect(hits.some((h) => h.fn === 'contentBoxSize')).toBe(true);
    expect(hits.some((h) => h.fn === 'sizeGraphCanvasToHost')).toBe(true);
  });

  it('ignores getBoundingClientRect outside the named functions (fixture)', () => {
    const hits = scanSource(
      'src/scenes/fixture-probe/scene.view.ts',
      POINTER_ORIGIN_FIXTURE
    );
    expect(hits).toEqual([]);
  });
});
