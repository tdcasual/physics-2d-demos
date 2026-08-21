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

// vitest 的 cwd 为项目根目录（与 scripts/check-scenes.ts 一致）
const scenesDir = resolve(process.cwd(), 'src/scenes');

/** 渲染代码是否经由响应式缩放机制 */
const RESPONSIVE_PATTERN =
  /responsiveScale|getResponsiveScale|scaledSize|sizeCanvasTo/;

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

const sceneIds = listSceneIds();
const sceneSources = new Map(
  sceneIds.map((id) => [id, collectSceneSource(id)])
);
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
        RESPONSIVE_PATTERN.test(source),
        `场景 "${id}" 未使用响应式缩放机制（responsiveScale / getResponsiveScale / ` +
          `scaledSize / sizeCanvasTo*）。移动端可能出现元素过大/过小。` +
          `参考 src/core/canvas-sizing.ts 与 projectile 场景。`
      ).toBe(true);
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
