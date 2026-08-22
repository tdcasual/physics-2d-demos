/**
 * 场景现代化标准契约测试（防漂移棘轮）
 *
 * 背景：各场景创建年代不同，质量参差。布局系统已稳定，场景会持续被
 * 现代化。本测试确保「新增/重写」的场景必须达到当前标准，且已达标
 * 的场景不会退化——从而把质量基线做成只升不降的棘轮。
 *
 * 与现有测试的分工：
 * - scripts/check-scenes.ts        → 文件结构（必需文件、controls、html）
 * - tests/contract/scene-contract  → 运行时生命周期契约（方法存在、可安全调用）
 * - 本测试                          → 渲染质量标准（响应式缩放 / 演示模式机制）
 *
 * 三项标准：
 * 1. 响应式缩放（强制，全员）：渲染代码必须经由 core 的响应式机制
 *    （responsiveScale / getResponsiveScale / scaledSize / sizeCanvasTo*），
 *    禁止裸写固定像素导致移动端过大/过小。
 * 2. 演示模式机制（棘轮豁免）：应使用 platform 标准机制
 *    （getRenderTokens / demoHints）实现 presentation
 *    模式。尚未改造的历史场景列于 PRESENTATION_EXEMPT；该清单只允许缩小：
 *    - 非豁免场景必须已采用标准机制；
 *    - 豁免场景一旦采用，测试会失败并提示「从豁免清单移除」，防止清单膨胀。
 * 3. 演示配置声明（强制，全员）：scene.meta.ts 必须声明并挂载
 *    demoProfile（SceneDemoProfile）。只查 view 层 demoHints 不够——
 *    meta 缺 demoProfile 时布局层不会执行面板策略（隐藏/折叠/overlay），
 *    演示模式只剩内容缩放，形同半残。
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

// vitest 的 cwd 为项目根目录（与 scripts/check-scenes.ts 一致）
const scenesDir = resolve(process.cwd(), 'src/scenes');

/** Graph-capable scenes must expose a standard graph mounting entry point. */
const GRAPH_ENTRY_PATTERN = /\b(?:renderGraph|attachGraphCanvas)\s*\(/;

/** 是否采用演示模式标准机制 */
const PRESENTATION_PATTERN = /getRenderTokens|demoHints/;

/**
 * 演示模式现代化豁免清单（历史遗留，只允许缩小，禁止新增）。
 * 当某个场景完成 presentation 模式改造后，从本数组删除它；
 * 若它已采用标准机制却仍在清单中，测试会失败提醒你删除。
 */
const PRESENTATION_EXEMPT: string[] = [];

/**
 * Historical renderers predate the strict large-literal rule. Keep this list
 * frozen and shrink it when a renderer is modernized; new scenes are checked
 * automatically because their id is absent from the list.
 */
const LARGE_RENDER_LITERAL_EXEMPT = new Set([
  'chase-meet',
  'doppler-effect',
  'double-slit',
  'electrification',
  'emf-analogy',
  'field-lines',
  'ganshe',
  'interference-formula',
  'mechanical-wave',
  'micrometer',
  'projectile',
  'spring-oscillator',
  'thin-film',
  'vernier-caliper',
  'vt-integral',
  'wedge'
]);

const CANVAS_SPATIAL_METHODS = new Set([
  'arc',
  'ellipse',
  'fillRect',
  'strokeRect',
  'clearRect',
  'rect',
  'roundRect',
  'fillText',
  'strokeText',
  'drawImage',
  'moveTo',
  'lineTo',
  'bezierCurveTo',
  'quadraticCurveTo',
  'translate'
]);

const DIMENSION_NAME_PATTERN =
  /(?:width|height|size|radius|diameter|offset|padding|margin|gap|font|stroke|line)/i;
const REFERENCE_DIMENSION_PATTERN =
  /(?:reference|design|base).*(?:width|height|size)/i;
const RESPONSIVE_FACTOR_PATTERN =
  /(?:scale|token|width|height|canvas|viewport)/i;

function listSceneIds(): string[] {
  return readdirSync(scenesDir)
    .filter((name) => statSync(join(scenesDir, name)).isDirectory())
    .sort();
}

/** 递归收集场景目录下所有 .ts 源码（含 renderer/ 子模块） */
function collectSceneSource(id: string): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.ts')) parts.push(readFileSync(full, 'utf8'));
    }
  };
  walk(resolve(scenesDir, id));
  return parts.join('\n');
}

function collectSceneRenderSource(id: string): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (
        entry.endsWith('.ts') &&
        (entry === 'scene.view.ts' || full.includes(`${join('', 'renderer')}/`))
      ) {
        parts.push(readFileSync(full, 'utf8'));
      }
    }
  };
  walk(resolve(scenesDir, id));
  return parts.join('\n');
}

const sceneIds = listSceneIds();
const sceneSources = new Map(
  sceneIds.map((id) => [id, collectSceneSource(id)])
);
const sceneRenderSources = new Map(
  sceneIds.map((id) => [id, collectSceneRenderSource(id)])
);

function expressionContainsResponsiveFactor(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (ts.isIdentifier(child) && RESPONSIVE_FACTOR_PATTERN.test(child.text)) {
      found = true;
      return;
    }
    if (!found) ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function isScaledLiteral(node: ts.NumericLiteral): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isStatement(current)) {
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === 'scaledSize'
    ) {
      return true;
    }
    if (
      ts.isBinaryExpression(current) &&
      (current.operatorToken.kind === ts.SyntaxKind.AsteriskToken ||
        current.operatorToken.kind === ts.SyntaxKind.SlashToken) &&
      expressionContainsResponsiveFactor(current)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function containingDimensionName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isStatement(current)) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = current.left;
      if (ts.isIdentifier(left)) return left.text;
      if (ts.isPropertyAccessExpression(left)) return left.name.text;
    }
    current = current.parent;
  }
  return null;
}

function isCanvasSpatialArgument(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isStatement(current)) {
    if (ts.isCallExpression(current)) {
      const expression = current.expression;
      return (
        ts.isPropertyAccessExpression(expression) &&
        CANVAS_SPATIAL_METHODS.has(expression.name.text)
      );
    }
    current = current.parent;
  }
  return false;
}

function findUnscaledLargeRenderLiterals(id: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(
    `${id}.render.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node) && Number(node.text) > 50) {
      const dimensionName = containingDimensionName(node);
      const isDimension =
        dimensionName !== null &&
        DIMENSION_NAME_PATTERN.test(dimensionName) &&
        !REFERENCE_DIMENSION_PATTERN.test(dimensionName);
      if (
        (isDimension || isCanvasSpatialArgument(node)) &&
        !isScaledLiteral(node)
      ) {
        const position = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        );
        violations.push(
          `${position.line + 1}:${position.character + 1} (${node.text})`
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function usesResponsiveSizing(id: string, source: string): boolean {
  const sourceFile = ts.createSourceFile(
    `${id}.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let found = false;
  const responsiveCalls = new Set([
    'getResponsiveScale',
    'scaledSize',
    'sizeCanvasToFill',
    'sizeCanvasToParent'
  ]);

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'responsiveScale'
    ) {
      found = true;
      return;
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const name = ts.isIdentifier(expression)
        ? expression.text
        : ts.isPropertyAccessExpression(expression)
          ? expression.name.text
          : '';
      if (responsiveCalls.has(name) || name.startsWith('sizeCanvasTo')) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}
const sceneMetaModules = import.meta.glob('../../src/scenes/*/scene.meta.ts', {
  eager: true,
  import: '*'
}) as Record<string, Record<string, unknown>>;

function findSceneMeta(id: string): {
  id: string;
  demoProfile?: {
    controlPanel: string;
    readoutPanel: string;
    renderHints: unknown;
  };
  testProfile?: {
    hasGraph: boolean;
    hasTransport: boolean;
    supportsPresentation: boolean;
  };
} | null {
  for (const module of Object.values(sceneMetaModules)) {
    const candidate = Object.values(module).find(
      (value): value is { id?: unknown } =>
        typeof value === 'object' && value !== null && 'id' in value
    );
    if (candidate?.id === id) {
      return candidate as {
        id: string;
        demoProfile?: {
          controlPanel: string;
          readoutPanel: string;
          renderHints: unknown;
        };
        testProfile?: {
          hasGraph: boolean;
          hasTransport: boolean;
          supportsPresentation: boolean;
        };
      };
    }
  }
  return null;
}

describe('scene modernization standard (anti-drift ratchet)', () => {
  it('discovers all scenes', () => {
    expect(sceneIds.length).toBeGreaterThanOrEqual(16);
  });

  describe('响应式缩放（强制，全员）', () => {
    it.each(sceneIds)('%s: 渲染代码经由响应式缩放机制', (id) => {
      const source = sceneSources.get(id)!;
      expect(
        usesResponsiveSizing(id, source),
        `场景 "${id}" 未使用响应式缩放机制（responsiveScale / getResponsiveScale / ` +
          `scaledSize / sizeCanvasTo*）。移动端可能出现元素过大/过小。` +
          `参考 src/core/canvas-sizing.ts 与 projectile 场景。`
      ).toBe(true);
    });

    it('detects unscaled large Canvas dimensions without rejecting scaled values', () => {
      const violations = findUnscaledLargeRenderLiterals(
        'fixture',
        `function draw(ctx: CanvasRenderingContext2D, responsiveScale: number) {
          const labelOffset = 64;
          ctx.arc(100, 100, 60, 0, Math.PI * 2);
          ctx.arc(100 * responsiveScale, 100 * responsiveScale, 60 * responsiveScale, 0, Math.PI * 2);
        }`
      );
      expect(violations).toHaveLength(4);
    });

    it('future scenes contain no unscaled large Canvas dimensions', () => {
      const violations = sceneIds
        .filter((id) => !LARGE_RENDER_LITERAL_EXEMPT.has(id))
        .flatMap((id) =>
          findUnscaledLargeRenderLiterals(id, sceneRenderSources.get(id)!).map(
            (violation) => `${id}:${violation}`
          )
        );
      expect(
        violations,
        'Large Canvas dimensions must be derived from responsiveScale, dimensions, or standard tokens'
      ).toEqual([]);
    });

    it('large-render-literal exemption list contains only known scenes', () => {
      expect(
        [...LARGE_RENDER_LITERAL_EXEMPT].filter((id) => !sceneIds.includes(id))
      ).toEqual([]);
    });
  });

  describe('演示模式机制（棘轮豁免）', () => {
    it.each(sceneIds.filter((id) => !PRESENTATION_EXEMPT.includes(id)))(
      '%s: 已采用演示模式标准机制',
      (id) => {
        const source = sceneSources.get(id)!;
        expect(
          PRESENTATION_PATTERN.test(source),
          `场景 "${id}" 未采用演示模式标准机制（getRenderTokens / ` +
            `demoHints）。presentation 模式下字号/线宽不会放大。若确属历史遗留，` +
            `需将其加入 PRESENTATION_EXEMPT（不推荐，应直接改造）。`
        ).toBe(true);
      }
    );

    it('豁免清单中的场景若已改造，应从清单移除（棘轮只缩不增）', () => {
      const modernized = PRESENTATION_EXEMPT.filter((id) => {
        const source = sceneSources.get(id);
        return source !== undefined && PRESENTATION_PATTERN.test(source);
      });
      expect(
        modernized,
        `以下场景已采用演示模式标准机制，请从 scene-standard.spec.ts 的 ` +
          `PRESENTATION_EXEMPT 中删除：${modernized.join(', ')}`
      ).toEqual([]);
    });

    it('豁免清单不得包含未知场景（防止拼写错误导致约束失效）', () => {
      const unknown = PRESENTATION_EXEMPT.filter(
        (id) => !sceneIds.includes(id)
      );
      expect(
        unknown,
        `PRESENTATION_EXEMPT 含不存在的场景：${unknown.join(', ')}`
      ).toEqual([]);
    });
  });

  describe('演示配置声明（强制，全员）', () => {
    it.each(sceneIds)('%s: scene.meta.ts 声明并挂载 demoProfile', (id) => {
      const meta = findSceneMeta(id);
      expect(
        meta,
        `场景 "${id}" 未找到可运行的 SceneMeta 导出。`
      ).not.toBeNull();
      expect(
        meta?.demoProfile,
        `场景 "${id}" 的 SceneMeta 未挂载 demoProfile。` +
          `缺少时演示模式不会应用面板策略（controlPanel/readoutPanel）。` +
          `参考 src/scenes/wedge/scene.meta.ts。`
      ).toMatchObject({
        controlPanel: expect.any(String),
        readoutPanel: expect.any(String),
        renderHints: expect.any(Object)
      });
    });
  });

  describe('场景测试能力声明（强制，全员）', () => {
    it.each(sceneIds)(
      '%s: declares a layout-independent test profile',
      (id) => {
        const meta = findSceneMeta(id);
        expect(meta?.testProfile, `${id} missing testProfile`).toMatchObject({
          hasGraph: expect.any(Boolean),
          hasTransport: expect.any(Boolean),
          supportsPresentation: expect.any(Boolean)
        });
      }
    );

    it.each(sceneIds)(
      '%s: graph capability matches a renderable graph entry point',
      (id) => {
        const meta = findSceneMeta(id);
        const source = sceneSources.get(id)!;
        if (meta?.testProfile?.hasGraph) {
          expect(
            GRAPH_ENTRY_PATTERN.test(source),
            `${id} declares hasGraph=true but exposes neither renderGraph nor attachGraphCanvas`
          ).toBe(true);
        }
      }
    );
  });
});
