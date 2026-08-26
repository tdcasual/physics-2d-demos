import { clamp } from '../../core/math';

export type FieldLinesScene = 'single' | 'like' | 'unlike' | 'custom';

export type FieldCharge = {
  x: number;
  y: number;
  q: number;
};

export type FieldLinesParams = {
  scene: FieldLinesScene;
  density: number;
  q1: number;
  q2: number;
};

export type ResolvedFieldLinesParams = FieldLinesParams;

export type FieldLinesSnapshot = {
  params: ResolvedFieldLinesParams;
  charges: FieldCharge[];
};

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
    density: clamp(
      Number.isFinite(input.density) ? Number(input.density) : 10,
      1,
      100
    ),
    q1: clamp(Number.isFinite(input.q1) ? Number(input.q1) : 1, -5, 5),
    q2: clamp(Number.isFinite(input.q2) ? Number(input.q2) : -1, -5, 5)
  };
}

export function createFieldLinesSim(initial: Partial<FieldLinesParams>) {
  let params = normalizeParams(initial);
  let charges = defaultCharges(params.scene, params.q1, params.q2);

  function rebuildCharges(): void {
    charges = defaultCharges(params.scene, params.q1, params.q2);
  }

  return {
    getParams(): ResolvedFieldLinesParams {
      return { ...params };
    },
    getSnapshot(): FieldLinesSnapshot {
      return {
        params: { ...params },
        charges: charges.map((charge) => ({ ...charge }))
      };
    },
    setScene(scene: FieldLinesScene): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, scene });
      rebuildCharges();
      return { ...params };
    },
    setDensity(density: number): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, density });
      return { ...params };
    },
    setCustomCharges(q1: number, q2: number): ResolvedFieldLinesParams {
      params = normalizeParams({ ...params, q1, q2 });
      if (params.scene === 'custom' && charges.length >= 2) {
        charges[0].q = params.q1;
        charges[1].q = params.q2;
      }
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
    },
    addCharge(q: number): void {
      // 在随机位置添加新电荷
      const newCharge: FieldCharge = {
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        q: q
      };
      charges.push(newCharge);
    },
    removeCharge(index: number): void {
      if (index < 0 || index >= charges.length) return;
      if (charges.length <= 1) return; // 至少保留一个电荷
      charges.splice(index, 1);
    },
    reset(): void {
      params = normalizeParams({
        scene: 'single',
        density: 10,
        q1: 1,
        q2: -1
      });
      rebuildCharges();
    },
    step(dt: number): void {
      void dt;
    }
  };
}
