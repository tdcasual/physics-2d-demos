/**
 * 读数格式契约（运行时）
 *
 * 每个场景 init 后推进 600 帧（10 s），每 20 帧采样 getReadoutItems()：
 * - 数值读数必须是有限数（NaN / Infinity 不得进入读数）
 * - 字符串读数不得含 NaN / Infinity / undefined
 * - 平台格式化后的文本不得出现负零（-0、-0.00、−0.0）
 * 另：仍返回「预格式化数字字符串」的读数项总数只许减少（新读数请返回
 * value: number + digits / sigFigs + unit，由 platform/readout 格式化）。
 */
import { describe, expect, it } from 'vitest';
import {
  formatReadoutValue,
  type ReadoutItem
} from '../../src/platform/readout';

/** 读数仍为预格式化数字字符串的项数（2026-10-25 迁移后），只许减少 */
const MAX_PREFORMATTED_NUMERIC = 162;

const NEGATIVE_ZERO = /(^|[^\d.])[-−]0(?:\.0+)?(?![\d.])/;
const BAD_TEXT = /NaN|Infinity|undefined/;

type SceneApi = {
  init?: () => void;
  step?: (dt: number) => void;
  getReadoutItems?: () => ReadoutItem[];
  dispose?: () => void;
};

const entries = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);

const scenes = Object.entries(entries)
  .map(([path, mod]) => {
    const id = path.split('/').slice(-2, -1)[0];
    const create = Object.entries(mod).find(
      ([name, value]) =>
        name.startsWith('create') &&
        name.endsWith('Scene') &&
        typeof value === 'function'
    )?.[1] as ((opts: Record<string, unknown>) => SceneApi) | undefined;
    return { id, create };
  })
  .filter(
    (
      s
    ): s is { id: string; create: (o: Record<string, unknown>) => SceneApi } =>
      Boolean(s.create)
  );

function makeScene(create: (o: Record<string, unknown>) => SceneApi): SceneApi {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const scene = create({
    canvas,
    theme: 'light',
    mode: 'normal',
    urlParams: {}
  });
  scene.init?.();
  return scene;
}

function isPreformattedNumber(item: ReadoutItem): boolean {
  return typeof item.value === 'string' && /\d/.test(item.value);
}

describe('readout format contract', () => {
  it.each(scenes)(
    '$id: readouts stay finite and never show negative zero',
    ({ id, create }) => {
      const scene = makeScene(create);
      if (!scene.getReadoutItems) return;
      const problems = new Set<string>();
      try {
        for (let frame = 0; frame <= 600; frame += 1) {
          if (frame % 20 === 0) {
            for (const item of scene.getReadoutItems()) {
              if (
                typeof item.value === 'number' &&
                !Number.isFinite(item.value)
              ) {
                problems.add(`${item.label}: non-finite ${item.value}`);
              }
              if (typeof item.value === 'string' && BAD_TEXT.test(item.value)) {
                problems.add(`${item.label}: "${item.value}"`);
              }
              const text = formatReadoutValue(item);
              if (NEGATIVE_ZERO.test(text)) {
                problems.add(`${item.label}: negative zero "${text}"`);
              }
            }
          }
          scene.step?.(1 / 60);
        }
      } finally {
        scene.dispose?.();
      }
      expect([...problems], id).toEqual([]);
    }
  );

  it('pre-formatted numeric readouts only shrink', () => {
    let count = 0;
    for (const { create } of scenes) {
      const scene = makeScene(create);
      count += (scene.getReadoutItems?.() ?? []).filter(
        isPreformattedNumber
      ).length;
      scene.dispose?.();
    }
    expect(
      count,
      '新读数请返回 value: number + digits / sigFigs + unit'
    ).toBeLessThanOrEqual(MAX_PREFORMATTED_NUMERIC);
    if (count < MAX_PREFORMATTED_NUMERIC) {
      console.warn(
        `[readout-format] pre-formatted numeric readouts: ${count} < ${MAX_PREFORMATTED_NUMERIC}; lower the freeze`
      );
    }
  });
});
