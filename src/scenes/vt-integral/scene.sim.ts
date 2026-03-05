export type VtScene = 'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5';
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
  surfaceTrue: number;
  surfaceApprox: number;
  surfaceRelErr: number;
  sphereTrue: number;
  sphereApprox: number;
  sphereRelErr: number;
};

export type VtIntegralSnapshot = {
  params: VtIntegralParams;
  metrics: VtIntegralMetrics;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function vFn(t: number): number {
  return 2 + 3 * t;
}

function integrateByRects(time: number, rects: number, method: VtMethod): number {
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
      sum += ((vFn(t0) + vFn(t1)) * 0.5) * dt;
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
  const trueArea = 2 * params.time + 1.5 * params.time * params.time;
  const rectArea = integrateByRects(params.time, params.rects, params.method);
  const absErr = Math.abs(rectArea - trueArea);
  const relErr = trueArea === 0 ? 0 : absErr / Math.abs(trueArea);

  const curveLen = curveLength(params.curveAmplitude);
  const lineDistance = 1;

  const circumference = Math.PI * 2;
  const polygon = 2 * params.circleN * Math.sin(Math.PI / params.circleN);
  const circumferenceDiff = Math.abs(circumference - polygon);

  const surfaceTrue = (4 / 3) * Math.PI;
  const surfaceApprox = surfaceTrue * (1 - 1 / (params.surfaceN + 2));
  const surfaceRelErr = Math.abs(surfaceApprox - surfaceTrue) / surfaceTrue;

  const sphereTrue = (4 / 3) * Math.PI;
  const sphereApprox = sphereTrue * (1 - 1 / (params.division / 12 + 5));
  const sphereRelErr = Math.abs(sphereApprox - sphereTrue) / sphereTrue;

  return {
    rectArea,
    trueArea,
    absErr,
    relErr,
    curveLength: curveLen,
    lineDistance,
    circumferenceDiff,
    surfaceTrue,
    surfaceApprox,
    surfaceRelErr,
    sphereTrue,
    sphereApprox,
    sphereRelErr
  };
}

function normalize(input: Partial<VtIntegralParams>): VtIntegralParams {
  const scene: VtScene =
    input.scene === 'scene1' ||
    input.scene === 'scene2' ||
    input.scene === 'scene3' ||
    input.scene === 'scene4' ||
    input.scene === 'scene5'
      ? input.scene
      : 'scene1';
  const method: VtMethod =
    input.method === 'left' || input.method === 'mid' || input.method === 'right' || input.method === 'trap'
      ? input.method
      : 'mid';
  return {
    scene,
    rects: Math.round(clamp(Number.isFinite(input.rects) ? Number(input.rects) : 10, 2, 40)),
    time: clamp(Number.isFinite(input.time) ? Number(input.time) : 5, 1, 10),
    method,
    curveAmplitude: clamp(Number.isFinite(input.curveAmplitude) ? Number(input.curveAmplitude) : 0.25, 0.05, 0.45),
    circleN: Math.round(clamp(Number.isFinite(input.circleN) ? Number(input.circleN) : 8, 3, 200)),
    surfaceN: Math.round(clamp(Number.isFinite(input.surfaceN) ? Number(input.surfaceN) : 1, 1, 10)),
    division: Math.round(clamp(Number.isFinite(input.division) ? Number(input.division) : 16, 16, 100))
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
        params = normalize({ ...params, curveAmplitude: params.curveAmplitude + 0.01 });
        return;
      }
      if (params.scene === 'scene3') {
        params = normalize({ ...params, circleN: params.circleN + 1 });
        return;
      }
      if (params.scene === 'scene4') {
        params = normalize({ ...params, surfaceN: params.surfaceN + 1 });
        return;
      }
      params = normalize({ ...params, division: params.division + 1 });
    }
  };
}
