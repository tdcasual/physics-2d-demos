export const VT_SCENE_VALUES = ['scene1', 'scene2', 'scene3'] as const;
export type VtScene = (typeof VT_SCENE_VALUES)[number];
export type VtMethod = 'left' | 'mid' | 'right' | 'trap';

export type VtIntegralParams = {
  scene: VtScene;
  rects: number;
  time: number;
  method: VtMethod;
  curveAmplitude: number;
  circleN: number;
  surfaceN: number;
  division: number;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function vFn(t: number): number {
  return 1 + 0.8 * t;
}

function integrateByRects(
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
      sum += vFn(t0) * dt;
    } else if (method === 'right') {
      sum += vFn(t1) * dt;
    } else if (method === 'mid') {
      sum += vFn((t0 + t1) * 0.5) * dt;
    } else {
      sum += (vFn(t0) + vFn(t1)) * 0.5 * dt;
    }
  }
  return sum;
}

function curveLength(amplitude: number, segments = 800): number {
  let length = 0;
  let prevX = 0;
  let prevY = 0;
  for (let i = 1; i <= segments; i += 1) {
    const x = i / segments;
    const y = amplitude * Math.sin(Math.PI * x);
    length += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }
  return length;
}

function buildMetrics(params: VtIntegralParams): VtIntegralMetrics {
  const trueArea = params.time + 0.4 * params.time * params.time;
  const rectArea = integrateByRects(params.time, params.rects, params.method);
  const absErr = Math.abs(rectArea - trueArea);
  const relErr = trueArea === 0 ? 0 : absErr / Math.abs(trueArea);

  const curveLen = curveLength(params.curveAmplitude);
  const lineDistance = 1;

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

function normalize(input: Partial<VtIntegralParams>): VtIntegralParams {
  // 运行时验证：无效场景值会回退到默认值，避免静默失败
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
  return {
    scene,
    rects: Math.round(
      clamp(Number.isFinite(input.rects) ? Number(input.rects) : 10, 2, 40)
    ),
    time: clamp(Number.isFinite(input.time) ? Number(input.time) : 5, 1, 10),
    method,
    curveAmplitude: clamp(
      Number.isFinite(input.curveAmplitude)
        ? Number(input.curveAmplitude)
        : 0.25,
      0.05,
      0.45
    ),
    circleN: Math.round(
      clamp(Number.isFinite(input.circleN) ? Number(input.circleN) : 8, 3, 200)
    ),
    surfaceN: 1,
    division: 16
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
      params = normalize({ ...params, rects: value });
    },
    setTime(value: number): void {
      params = normalize({ ...params, time: value });
    },
    setMethod(method: VtMethod): void {
      params = normalize({ ...params, method });
    },
    setCurveAmplitude(value: number): void {
      params = normalize({ ...params, curveAmplitude: value });
    },
    setCircleN(value: number): void {
      params = normalize({ ...params, circleN: value });
    },
    setSurfaceN(value: number): void {
      params = normalize({ ...params, surfaceN: value });
    },
    setDivision(value: number): void {
      params = normalize({ ...params, division: value });
    },
    reset(): void {
      params = normalize({
        scene: 'scene1',
        rects: 10,
        time: 5,
        method: 'mid',
        curveAmplitude: 0.25,
        circleN: 8,
        surfaceN: 1,
        division: 16
      });
    },
    step(dt: number): void {
      void dt;
      if (params.scene === 'scene1') {
        params = normalize({ ...params, rects: params.rects + 1 });
        return;
      }
      if (params.scene === 'scene2') {
        params = normalize({
          ...params,
          curveAmplitude: params.curveAmplitude + 0.01
        });
        return;
      }
      params = normalize({ ...params, circleN: params.circleN + 1 });
    }
  };
}
