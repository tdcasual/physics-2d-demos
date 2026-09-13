import { clamp } from '../../core/math';
export type AccelForceMode = 'force' | 'inverseMass';
export type AccelForceParams = {
  mode: AccelForceMode;
  cartMass: number;
  hangerMass: number;
  balanced: boolean;
  autoRun: boolean;
};
export type AccelForceState = {
  params: AccelForceParams;
  time: number;
  acceleration: number;
  force: number;
  velocity: number;
  position: number;
  samples: Array<{ x: number; y: number }>;
  status: string;
};
export const accelForceConstants = {
  baseWidth: 900,
  baseHeight: 660,
  fieldWidth: 650,
  trackY: 250,
  cartX: 270,
  trackLeft: 80,
  trackRight: 610,
  graphLeft: 80,
  graphRight: 610,
  graphTop: 360,
  graphBottom: 560,
  panelWidth: 236,
  panelInset: 24,
  gridStep: 50,
  graphMaxForce: 0.6,
  graphMaxAccel: 1.5,
  hangerYOffset: 55,
  formulaBoxY: 104
} as const;
const G = 9.8;
function finite(v: unknown, f: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : f;
}
function normalize(
  input: Partial<AccelForceParams>,
  prev?: AccelForceParams
): AccelForceParams {
  return {
    mode:
      input.mode === 'inverseMass' ? 'inverseMass' : (prev?.mode ?? 'force'),
    cartMass: clamp(finite(input.cartMass, prev?.cartMass ?? 0.4), 0.2, 1),
    hangerMass: clamp(
      finite(input.hangerMass, prev?.hangerMass ?? 0.03),
      0,
      0.2
    ),
    balanced: input.balanced ?? prev?.balanced ?? true,
    autoRun: input.autoRun ?? prev?.autoRun ?? true
  };
}
export function theoreticalAcceleration(
  cartMass: number,
  hangerMass: number
): number {
  return (
    (G * Math.max(0, hangerMass)) /
    Math.max(0.01, cartMass + Math.max(0, hangerMass))
  );
}
export function createAccelForceSim(initial: Partial<AccelForceParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let position = 0;
  function getState(): AccelForceState {
    const force = params.hangerMass * G;
    const friction = params.balanced
      ? 0
      : Math.min(force * 0.7, params.cartMass * G * 0.08);
    const acceleration = Math.max(
      0,
      (force - friction) / (params.cartMass + params.hangerMass)
    );
    const velocity = acceleration * time;
    const samples = Array.from({ length: 8 }, (_, i) => {
      const x = params.mode === 'force' ? i * 0.08 : 1 / (0.25 + i * 0.1);
      const y =
        params.mode === 'force'
          ? theoreticalAcceleration(params.cartMass, (i * 0.08) / G)
          : theoreticalAcceleration(1 / Math.max(0.1, x), params.hangerMass);
      return { x, y };
    });
    return {
      params: { ...params },
      time,
      acceleration,
      force,
      velocity,
      position,
      samples,
      status: params.balanced ? '已平衡摩擦力' : '未平衡：不得宣称正比'
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): AccelForceParams => ({ ...params }),
    setParams(next: Partial<AccelForceParams>): AccelForceParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const d = Math.max(0, finite(dt, 0));
      time += d;
      position = Math.min(420, position + getState().velocity * d * 20);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      position = 0;
    }
  };
}
