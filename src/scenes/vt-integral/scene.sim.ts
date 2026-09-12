import { clamp } from '../../core/math';

const VT_SCENE_VALUES = ['scene1', 'scene2', 'scene3'] as const;
export type VtScene = (typeof VT_SCENE_VALUES)[number];
export type VtMethod = 'left' | 'mid' | 'right' | 'trap';
export type VtCurveKind = 'constant' | 'linear' | 'quadratic' | 'sine';

const CURVE_KIND_VALUES: readonly VtCurveKind[] = [
  'constant',
  'linear',
  'quadratic',
  'sine'
];

export type VtIntegralParams = {
  scene: VtScene;
  rects: number;
  time: number;
  method: VtMethod;
  curveKind: VtCurveKind;
  curveAmplitude: number;
  circleN: number;
  surfaceN: number;
  division: number;
  pointA: number;
  pointB: number;
};

export type VtIntegralMetrics = {
  rectArea: number;
  trueArea: number;
  absErr: number;
  relErr: number;
  curveLength: number;
  lineDistance: number;
  circumferenceDiff: number;
};

export type VtIntegralSnapshot = {
  params: VtIntegralParams;
  metrics: VtIntegralMetrics;
};

/** v(t) 与控件文案一致：匀速 2、匀加速 0.5t、变加速 0.1t²、正弦 sin(t)。 */
export function vAt(kind: VtCurveKind, t: number): number {
  switch (kind) {
    case 'constant':
      return 2;
    case 'linear':
      return 0.5 * t;
    case 'quadratic':
      return 0.1 * t * t;
    case 'sine':
      return Math.sin(t);
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

/** ∫₀ᵀ v(t) dt，手算：2T、0.25 T²、T³/30、1−cos T。 */
export function trueAreaOf(kind: VtCurveKind, time: number): number {
  switch (kind) {
    case 'constant':
      return 2 * time;
    case 'linear':
      return 0.25 * time * time;
    case 'quadratic':
      return (0.1 / 3) * time * time * time;
    case 'sine':
      return 1 - Math.cos(time);
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function curveY(x: number, amplitude: number): number {
  return amplitude * Math.sin(Math.PI * x);
}

export function chordLength(x0: number, x1: number, amplitude: number): number {
  const y0 = curveY(x0, amplitude);
  const y1 = curveY(x1, amplitude);
  return Math.hypot(x1 - x0, y1 - y0);
}

export function arcLength(
  x0: number,
  x1: number,
  amplitude: number,
  segments = 400
): number {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  if (b - a < 1e-12) return 0;
  const steps = Math.max(8, Math.round(segments * (b - a)));
  let length = 0;
  let prevX = a;
  let prevY = curveY(a, amplitude);
  for (let i = 1; i <= steps; i += 1) {
    const x = a + ((b - a) * i) / steps;
    const y = curveY(x, amplitude);
    length += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }
  return length;
}

function integrateByRects(
  kind: VtCurveKind,
  time: number,
  rects: number,
  method: VtMethod
): number {
  const dt = time / rects;
  let sum = 0;
  for (let i = 0; i < rects; i += 1) {
    const t0 = i * dt;
    const t1 = (i + 1) * dt;
    if (method === 'left') {
      sum += vAt(kind, t0) * dt;
    } else if (method === 'right') {
      sum += vAt(kind, t1) * dt;
    } else if (method === 'mid') {
      sum += vAt(kind, (t0 + t1) * 0.5) * dt;
    } else {
      sum += (vAt(kind, t0) + vAt(kind, t1)) * 0.5 * dt;
    }
  }
  return sum;
}

function buildMetrics(params: VtIntegralParams): VtIntegralMetrics {
  const trueArea = trueAreaOf(params.curveKind, params.time);
  const rectArea = integrateByRects(
    params.curveKind,
    params.time,
    params.rects,
    params.method
  );
  const absErr = Math.abs(rectArea - trueArea);
  const relErr = trueArea === 0 ? 0 : absErr / Math.abs(trueArea);

  const curveLen = arcLength(
    params.pointA,
    params.pointB,
    params.curveAmplitude
  );
  const lineDistance = chordLength(
    params.pointA,
    params.pointB,
    params.curveAmplitude
  );

  const circumference = Math.PI * 2;
  const polygon = 2 * params.circleN * Math.sin(Math.PI / params.circleN);
  const circumferenceDiff = Math.abs(circumference - polygon);

  return {
    rectArea,
    trueArea,
    absErr,
    relErr,
    curveLength: curveLen,
    lineDistance,
    circumferenceDiff
  };
}

function asCurveKind(value: unknown): VtCurveKind {
  if (
    typeof value === 'string' &&
    (CURVE_KIND_VALUES as readonly string[]).includes(value)
  ) {
    return value as VtCurveKind;
  }
  return 'linear';
}

function normalize(input: Partial<VtIntegralParams>): VtIntegralParams {
  const scene: VtScene = VT_SCENE_VALUES.includes(input.scene as VtScene)
    ? (input.scene as VtScene)
    : 'scene1';
  const method: VtMethod =
    input.method === 'left' ||
    input.method === 'mid' ||
    input.method === 'right' ||
    input.method === 'trap'
      ? input.method
      : 'mid';
  const n = Math.round(
    clamp(Number.isFinite(input.rects) ? Number(input.rects) : 10, 2, 50)
  );
  return {
    scene,
    rects: n,
    time: clamp(Number.isFinite(input.time) ? Number(input.time) : 5, 1, 10),
    method,
    curveKind: asCurveKind(input.curveKind),
    curveAmplitude: clamp(
      Number.isFinite(input.curveAmplitude)
        ? Number(input.curveAmplitude)
        : 0.45,
      0.15,
      0.8
    ),
    circleN: Math.round(
      clamp(Number.isFinite(input.circleN) ? Number(input.circleN) : n, 3, 200)
    ),
    surfaceN: 1,
    division: 16,
    pointA: clamp(
      Number.isFinite(input.pointA) ? Number(input.pointA) : 0.18,
      0,
      1
    ),
    pointB: clamp(
      Number.isFinite(input.pointB) ? Number(input.pointB) : 0.82,
      0,
      1
    )
  };
}

export function createVtIntegralSim(initial: Partial<VtIntegralParams> = {}) {
  let params = normalize(initial);

  return {
    getSnapshot(): VtIntegralSnapshot {
      return {
        params: { ...params },
        metrics: buildMetrics(params)
      };
    },
    setScene(scene: VtScene): void {
      params = normalize({ ...params, scene });
    },
    setRects(value: number): void {
      params = normalize({ ...params, rects: value, circleN: value });
    },
    setTime(value: number): void {
      params = normalize({ ...params, time: value });
    },
    setMethod(method: VtMethod): void {
      params = normalize({ ...params, method });
    },
    setCurveKind(kind: VtCurveKind): void {
      params = normalize({ ...params, curveKind: kind });
    },
    setCurveAmplitude(value: number): void {
      params = normalize({ ...params, curveAmplitude: value });
    },
    setCircleN(value: number): void {
      params = normalize({ ...params, circleN: value, rects: value });
    },
    setSurfaceN(value: number): void {
      params = normalize({ ...params, surfaceN: value });
    },
    setDivision(value: number): void {
      params = normalize({ ...params, division: value });
    },
    setPointA(value: number): void {
      params = normalize({ ...params, pointA: value });
    },
    setPointB(value: number): void {
      params = normalize({ ...params, pointB: value });
    },
    reset(): void {
      params = normalize({
        scene: params.scene,
        rects: 10,
        time: 5,
        method: 'mid',
        curveKind: 'linear',
        curveAmplitude: 0.45,
        circleN: 8,
        surfaceN: 1,
        division: 16,
        pointA: 0.18,
        pointB: 0.82
      });
    },
    step(_dt: number): void {
      void _dt;
    }
  };
}
