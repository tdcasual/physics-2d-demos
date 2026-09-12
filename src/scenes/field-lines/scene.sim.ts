/**
 * 电场线演化 — 用试探电荷测 E，加密后连成电场线
 *
 * 线条条数由 |Q| 决定（高斯定理：通量 ∝ 电荷量），不随试探次数 n 变化。
 * n 只控制每条预定电场线上的采样点数。
 */

import { clamp } from '../../core/math';

export type FieldLinesScene = 'single' | 'like' | 'unlike' | 'custom';

export type FieldCharge = {
  x: number;
  y: number;
  q: number;
};

export const PROBE_N_MIN = 1;
export const PROBE_N_MAX = 40;
export const PROBE_N_DEFAULT = 3;

/** 单位电荷发出的电场线条数（教学用约定，不随 n 改变） */
export const LINES_PER_UNIT_CHARGE = 8;
export const MIN_LINES_PER_CHARGE = 4;
export const MAX_LINES_PER_CHARGE = 16;

export type FieldLinesParams = {
  scene: FieldLinesScene;
  /** 每条电场线上的试探点数 */
  n: number;
  q1: number;
  q2: number;
};

export type ResolvedFieldLinesParams = FieldLinesParams;

export type FieldLinesSnapshot = {
  params: ResolvedFieldLinesParams;
  charges: FieldCharge[];
};

export function linesForCharge(q: number): number {
  if (q === 0) return 0;
  return Math.max(
    MIN_LINES_PER_CHARGE,
    Math.min(
      MAX_LINES_PER_CHARGE,
      Math.round(LINES_PER_UNIT_CHARGE * Math.abs(q))
    )
  );
}

/** 由电荷量决定的电场线条数；有正电荷时只从正电荷出发 */
export function seedLineCount(charges: Array<{ q: number }>): number {
  const positives = charges.filter((c) => c.q > 0);
  const seeds =
    positives.length > 0 ? positives : charges.filter((c) => c.q < 0);
  return seeds.reduce((sum, c) => sum + linesForCharge(c.q), 0);
}

function defaultCharges(
  scene: FieldLinesScene,
  q1: number,
  q2: number
): FieldCharge[] {
  if (scene === 'single') {
    return [{ x: 0.5, y: 0.5, q: 1 }];
  }
  if (scene === 'like') {
    return [
      { x: 0.34, y: 0.5, q: 1 },
      { x: 0.66, y: 0.5, q: 1 }
    ];
  }
  if (scene === 'unlike') {
    return [
      { x: 0.34, y: 0.5, q: 1 },
      { x: 0.66, y: 0.5, q: -1 }
    ];
  }
  return [
    { x: 0.34, y: 0.5, q: q1 },
    { x: 0.66, y: 0.5, q: q2 }
  ];
}

function normalizeParams(
  input: Partial<FieldLinesParams>
): ResolvedFieldLinesParams {
  const scene: FieldLinesScene =
    input.scene === 'single' ||
    input.scene === 'like' ||
    input.scene === 'unlike' ||
    input.scene === 'custom'
      ? input.scene
      : 'single';

  return {
    scene,
    n: clamp(
      Number.isFinite(input.n) ? Math.round(Number(input.n)) : PROBE_N_DEFAULT,
      PROBE_N_MIN,
      PROBE_N_MAX
    ),
    q1: clamp(Number.isFinite(input.q1) ? Number(input.q1) : 1, -5, 5),
    q2: clamp(Number.isFinite(input.q2) ? Number(input.q2) : -1, -5, 5)
  };
}

export function createFieldLinesSim(initial: Partial<FieldLinesParams>) {
  let params = normalizeParams(initial);
  let charges = defaultCharges(params.scene, params.q1, params.q2);
  let snapshotCache: FieldLinesSnapshot | null = null;

  function rebuildCharges(): void {
    charges = defaultCharges(params.scene, params.q1, params.q2);
  }

  function invalidateSnapshot(): void {
    snapshotCache = null;
  }

  return {
    getParams(): ResolvedFieldLinesParams {
      return { ...params };
    },
    getSnapshot(): FieldLinesSnapshot {
      if (!snapshotCache) {
        snapshotCache = {
          params: { ...params },
          charges: charges.map((charge) => ({ ...charge }))
        };
      }
      return snapshotCache;
    },
    setScene(scene: FieldLinesScene): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, scene });
      rebuildCharges();
      invalidateSnapshot();
      return { ...params };
    },
    setN(n: number): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, n });
      invalidateSnapshot();
      return { ...params };
    },
    setCustomCharges(q1: number, q2: number): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, q1, q2 });
      if (params.scene === 'custom' && charges.length >= 2) {
        charges[0].q = params.q1;
        charges[1].q = params.q2;
      }
      invalidateSnapshot();
      return { ...params };
    },
    pickCharge(x: number, y: number, radiusNorm = 0.045): number | null {
      for (let i = charges.length - 1; i >= 0; i -= 1) {
        const dx = x - charges[i].x;
        const dy = y - charges[i].y;
        if (Math.hypot(dx, dy) <= radiusNorm) {
          return i;
        }
      }
      return null;
    },
    setChargePosition(index: number, x: number, y: number): void {
      if (index < 0 || index >= charges.length) return;
      charges[index].x = clamp(x, 0.02, 0.98);
      charges[index].y = clamp(y, 0.02, 0.98);
      invalidateSnapshot();
    },
    addCharge(q: number): void {
      const newCharge: FieldCharge = {
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        q: q
      };
      charges.push(newCharge);
      invalidateSnapshot();
    },
    removeCharge(index: number): void {
      if (index < 0 || index >= charges.length) return;
      if (charges.length <= 1) return;
      charges.splice(index, 1);
      invalidateSnapshot();
    },
    reset(): void {
      params = normalizeParams({
        scene: 'single',
        n: PROBE_N_DEFAULT,
        q1: 1,
        q2: -1
      });
      rebuildCharges();
      invalidateSnapshot();
    },
    step(dt: number): void {
      void dt;
    }
  };
}
