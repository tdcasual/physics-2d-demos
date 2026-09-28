/**
 * hasGraph 双源一致性契约（v13 Wave H H1b + §9 条款 4 + 条款 16）
 *
 * 逐布局解析 effectiveHasGraph = override ?? page ?? true（复刻布局
 * `hasGraph !== false` 语义）。图槽生效时 meta.testProfile.hasGraph
 * 必须为 true，消灭 M9（page=true + 仅 mobile-stack false + meta=false）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import { layoutRegistry } from '../../src/app/layouts/registry';

const scenesDir = resolve(process.cwd(), 'src/scenes');

const sceneMetaModules = import.meta.glob('../../src/scenes/*/scene.meta.ts', {
  eager: true,
  import: '*'
}) as Record<string, Record<string, unknown>>;

type LayoutOverrideInfo = {
  hasGraph: boolean | undefined;
  hasGraphKey: boolean;
};

type PageLayoutConfig = {
  hasGraph: boolean | undefined;
  hasGraphKey: boolean;
  layoutOverrides: Record<string, LayoutOverrideInfo>;
};

function listSceneIds(): string[] {
  return readdirSync(scenesDir)
    .filter(
      (name) =>
        statSync(join(scenesDir, name)).isDirectory() &&
        existsSync(join(scenesDir, name, 'scene.meta.ts'))
    )
    .sort();
}

function findSceneMeta(id: string): {
  testProfile?: { hasGraph?: boolean };
} | null {
  for (const module of Object.values(sceneMetaModules)) {
    const candidate = Object.values(module).find(
      (value): value is { id?: unknown } =>
        typeof value === 'object' && value !== null && 'id' in value
    );
    if (candidate?.id === id) {
      return candidate as { testProfile?: { hasGraph?: boolean } };
    }
  }
  return null;
}

function propertyKey(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function objectProp(
  obj: ts.ObjectLiteralExpression,
  name: string
): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (propertyKey(prop.name) === name) return prop.initializer;
  }
  return undefined;
}

function booleanLiteral(expr: ts.Expression): boolean | undefined {
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function parseOverrideMap(
  expr: ts.Expression | undefined
): Record<string, LayoutOverrideInfo> {
  const out: Record<string, LayoutOverrideInfo> = {};
  if (!expr || !ts.isObjectLiteralExpression(expr)) return out;
  for (const prop of expr.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const layoutId = propertyKey(prop.name);
    if (!layoutId || !ts.isObjectLiteralExpression(prop.initializer)) continue;
    const hasGraphExpr = objectProp(prop.initializer, 'hasGraph');
    out[layoutId] = {
      hasGraphKey: hasGraphExpr !== undefined,
      hasGraph:
        hasGraphExpr !== undefined ? booleanLiteral(hasGraphExpr) : undefined
    };
  }
  return out;
}

function parsePageLayoutConfig(sourceText: string): PageLayoutConfig | null {
  const sourceFile = ts.createSourceFile(
    'page.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let found: PageLayoutConfig | null = null;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : '';
      if (
        name === 'bootScenePage' &&
        node.arguments[0] &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        const layoutConfigExpr = objectProp(node.arguments[0], 'layoutConfig');
        if (!layoutConfigExpr) {
          found = {
            hasGraph: undefined,
            hasGraphKey: false,
            layoutOverrides: {}
          };
          return;
        }
        if (!ts.isObjectLiteralExpression(layoutConfigExpr)) {
          found = {
            hasGraph: undefined,
            hasGraphKey: false,
            layoutOverrides: {}
          };
          return;
        }
        const hasGraphExpr = objectProp(layoutConfigExpr, 'hasGraph');
        found = {
          hasGraphKey: hasGraphExpr !== undefined,
          hasGraph:
            hasGraphExpr !== undefined
              ? booleanLiteral(hasGraphExpr)
              : undefined,
          layoutOverrides: parseOverrideMap(
            objectProp(layoutConfigExpr, 'layoutOverrides')
          )
        };
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

describe('hasGraph dual-source consistency (H1b)', () => {
  beforeEach(() => {
    layoutRegistry.clear();
    registerAllLayouts();
  });

  afterEach(() => {
    layoutRegistry.clear();
  });

  const sceneIds = listSceneIds();

  it.each(sceneIds)(
    '%s: per-layout effectiveHasGraph cannot show a graph slot when meta is false',
    (id) => {
      const meta = findSceneMeta(id);
      expect(meta?.testProfile, `场景 "${id}" 缺少 testProfile`).toBeDefined();
      const metaHasGraph = meta!.testProfile!.hasGraph;
      expect(
        typeof metaHasGraph,
        `场景 "${id}" testProfile.hasGraph 必须是 boolean`
      ).toBe('boolean');

      const pagePath = join(scenesDir, id, 'page.ts');
      expect(existsSync(pagePath), `场景 "${id}" 缺少 page.ts`).toBe(true);
      const parsed = parsePageLayoutConfig(readFileSync(pagePath, 'utf8'));
      expect(
        parsed,
        `场景 "${id}" page.ts 未找到 bootScenePage({...}) 对象字面量`
      ).not.toBeNull();

      const pageHasGraph = parsed!.hasGraph;
      if (parsed!.hasGraphKey) {
        expect(
          typeof pageHasGraph,
          `场景 "${id}" layoutConfig.hasGraph 必须是 boolean 字面量`
        ).toBe('boolean');
      }

      const defaultEffective = pageHasGraph ?? true;
      const layouts: Array<{ layoutId: string; effective: boolean }> = [
        { layoutId: '(default)', effective: defaultEffective }
      ];
      for (const [layoutId, override] of Object.entries(
        parsed!.layoutOverrides
      )) {
        const effective = override.hasGraphKey
          ? (override.hasGraph ?? defaultEffective)
          : defaultEffective;
        layouts.push({ layoutId, effective });
      }

      const illegal = layouts.filter(
        ({ effective }) => effective && metaHasGraph !== true
      );
      expect(
        illegal,
        `场景 "${id}" meta.testProfile.hasGraph=${String(metaHasGraph)} 但 ` +
          `下列布局 effectiveHasGraph=true（会建空图区/空 tab）：` +
          illegal.map((row) => row.layoutId).join(', ')
      ).toEqual([]);
    }
  );

  it.each(sceneIds)(
    '%s: layoutOverrides keys are registered layout ids (§9 条款 4.1)',
    (id) => {
      const registered = new Set(
        layoutRegistry.getAllMetadata().map((m) => m.id)
      );
      const pagePath = join(scenesDir, id, 'page.ts');
      const parsed = parsePageLayoutConfig(readFileSync(pagePath, 'utf8'));
      const unknown = Object.keys(parsed?.layoutOverrides ?? {}).filter(
        (layoutId) => !registered.has(layoutId)
      );
      expect(
        unknown,
        `场景 "${id}" layoutOverrides 含未注册布局 id（拼错会静默失效）：` +
          unknown.join(', ')
      ).toEqual([]);
    }
  );

  it.each(sceneIds)(
    '%s: hasGraph:true override requires meta.testProfile.hasGraph (§9 条款 4.2)',
    (id) => {
      const meta = findSceneMeta(id);
      const pagePath = join(scenesDir, id, 'page.ts');
      const parsed = parsePageLayoutConfig(readFileSync(pagePath, 'utf8'));
      const trueOverrideIds = Object.entries(parsed?.layoutOverrides ?? {})
        .filter(([, override]) => override.hasGraph === true)
        .map(([layoutId]) => layoutId);
      if (trueOverrideIds.length === 0) return;
      expect(
        meta?.testProfile?.hasGraph,
        `场景 "${id}" 在 layoutOverrides[${trueOverrideIds.join(',')}] ` +
          `把 hasGraph 置 true，但 meta.testProfile.hasGraph 不是 true` +
          `（会造出有图表 tab 但无 renderGraph 的空 tab）`
      ).toBe(true);
    }
  );
});
