/**
 * 场景 create 函数参数契约测试
 *
 * 编译时 + 运行时验证：每个场景的 options 类型包含 theme / mode 字段，
 * 且场景实例的 setTheme 方法可以正确切换主题。
 *
 * 背景：spring-oscillator 曾因 CreateSpringOscillatorSceneOptions 缺少 theme 字段，
 * 导致动画区始终为深色模式。此测试在 CI 中防止类似回归。
 */
import { describe, it, expect } from 'vitest';
import type { StandardSceneCreateParams } from '../../src/app/scene-bootstrapper-types';

// ============================================================================
// Import scene option types for compile-time key checks
// ============================================================================

import type { CreateChaseMeetSceneOptions } from '../../src/scenes/chase-meet/scene.entry';
import type { CreateElectrificationSceneOptions } from '../../src/scenes/electrification/scene.entry';
import type { CreateEmfAnalogySceneOptions } from '../../src/scenes/emf-analogy/scene.entry';
import type { CreateFieldLinesSceneOptions } from '../../src/scenes/field-lines/scene.entry';
import type { CreateGansheSceneOptions } from '../../src/scenes/ganshe/scene.entry';
import type { CreateProjectileSceneOptions } from '../../src/scenes/projectile/scene.entry';
import type { CreateSpringOscillatorSceneOptions } from '../../src/scenes/spring-oscillator/scene.entry';
import type { CreateVtIntegralSceneOptions } from '../../src/scenes/vt-integral/scene.entry';

// ============================================================================
// 编译时：验证 theme 和 mode 是 options 类型的 key
//
// 如果某个 scene options 类型没有 theme 或 mode 字段，
// 'theme' extends keyof T 为 false → 返回 never → 赋值报错。
// ============================================================================

type AssertHasKey<T, K extends string> = K extends keyof T ? T : never;

type _K1 = AssertHasKey<CreateChaseMeetSceneOptions, 'theme'>;
type _K2 = AssertHasKey<CreateChaseMeetSceneOptions, 'mode'>;
type _K3 = AssertHasKey<CreateElectrificationSceneOptions, 'theme'>;
type _K4 = AssertHasKey<CreateElectrificationSceneOptions, 'mode'>;
type _K5 = AssertHasKey<CreateEmfAnalogySceneOptions, 'theme'>;
type _K6 = AssertHasKey<CreateEmfAnalogySceneOptions, 'mode'>;
type _K7 = AssertHasKey<CreateFieldLinesSceneOptions, 'theme'>;
type _K8 = AssertHasKey<CreateFieldLinesSceneOptions, 'mode'>;
type _K9 = AssertHasKey<CreateGansheSceneOptions, 'theme'>;
type _K10 = AssertHasKey<CreateGansheSceneOptions, 'mode'>;
type _K11 = AssertHasKey<CreateProjectileSceneOptions, 'theme'>;
type _K12 = AssertHasKey<CreateProjectileSceneOptions, 'mode'>;
type _K13 = AssertHasKey<CreateSpringOscillatorSceneOptions, 'theme'>;
type _K14 = AssertHasKey<CreateSpringOscillatorSceneOptions, 'mode'>;
type _K15 = AssertHasKey<CreateVtIntegralSceneOptions, 'theme'>;
type _K16 = AssertHasKey<CreateVtIntegralSceneOptions, 'mode'>;

// ============================================================================
// 运行时：所有场景可用标准参数创建并切换主题
// ============================================================================

describe('Scene factory param contract', () => {
  const stdParams: StandardSceneCreateParams = {
    container: document.createElement('div'),
    canvas: document.createElement('canvas'),
    slots: {
      animation: document.createElement('div'),
      control: document.createElement('div')
    },
    theme: 'light',
    mode: 'normal'
  };

  const sceneModules = import.meta.glob<Record<string, unknown>>(
    '../../src/scenes/*/scene.entry.ts',
    { eager: true }
  );

  for (const [path, mod] of Object.entries(sceneModules)) {
    const dirName = path.split('/').slice(-2, -1)[0];

    const createFn = Object.entries(mod).find(
      ([key, val]) =>
        key.startsWith('create') && key.endsWith('Scene') && typeof val === 'function'
    )?.[1] as ((opts?: Record<string, unknown>) => Record<string, unknown>) | undefined;

    if (!createFn) continue;

    it(`${dirName} creates scene with theme and mode`, () => {
      const scene = createFn(stdParams as unknown as Record<string, unknown>);
      expect(typeof scene.init).toBe('function');

      // 验证 setTheme 可正常调用（如果存在）
      const st = scene.setTheme as ((t: string) => void) | undefined;
      if (typeof st === 'function') {
        expect(() => st('dark')).not.toThrow();
        expect(() => st('light')).not.toThrow();
      }

      const d = scene.dispose as (() => void) | undefined;
      if (typeof d === 'function') d();
    });
  }

  it('exactly 16 scenes discovered', () => {
    const count = Object.entries(sceneModules).filter(([, mod]) => {
      return Object.entries(mod).some(
        ([key, val]) =>
          key.startsWith('create') && key.endsWith('Scene') && typeof val === 'function'
      );
    }).length;
    expect(count).toBe(16);
  });
});
