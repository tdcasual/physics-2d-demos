/**
 * 平抛运动实验（描迹法）仿真。
 *
 * 坐标系与白纸一致：原点 O 取小球在斜槽末端时的球心，x 水平向右，
 * y 沿铅垂线向下，长度单位 cm，时间单位 s。
 *
 * 流程：小球从斜槽上选定高度由静止滚下 → 末端水平抛出 → 落在倾斜挡板上，
 * 被挤向背板，经复写纸在白纸上留下一个落点 → 逐次下移挡板重复 →
 * 用平滑曲线连接落点得到轨迹 → 取点测 (x, y) 求初速度。
 */

/** 重力加速度（m/s²），与数据处理环节的已知量一致。 */
export const G_MS2 = 9.8;
/** 重力加速度（cm/s²）。 */
export const G_CMS2 = G_MS2 * 100;

/** 斜槽圆弧段球心轨迹半径（cm）。 */
export const CHUTE_RADIUS_CM = 14;
/** 斜槽末端水平段长度（cm）。 */
export const CHUTE_FLAT_CM = 6;
/** 小钢球半径（cm）。 */
export const BALL_RADIUS_CM = 1;

export const RELEASE_H_MIN_CM = 4;
export const RELEASE_H_MAX_CM = 12;
export const RELEASE_H_STEP_CM = 0.5;
export const PLATE_Y_MIN_CM = 6;
export const PLATE_Y_MAX_CM = 42;
export const PLATE_Y_STEP_CM = 1;
/** 「挡板下移一格」的步长（cm）。 */
export const PLATE_LOWER_STEP_CM = 6;

/** 白纸（坐标纸）尺寸（cm）。 */
export const PAPER_WIDTH_CM = 45;
export const PAPER_HEIGHT_CM = 46;

/** 描迹所需的最少落点高度数，也是数据处理的取点数。 */
export const MEASURE_POINT_COUNT = 5;
export const MEASURE_POINT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/** 每次释放的出射速度相对涨落上限（静止释放的手抖、摩擦起伏）。 */
export const LAUNCH_JITTER = 0.004;

/** 斜槽末端倾角范围（°，正值为末端上翘）。 */
export const CHUTE_TILT_MAX_DEG = 8;
/** 不用定位卡时，每次释放高度的随机偏差上限（cm）。 */
export const LOOSE_RELEASE_SPREAD_CM = 1.5;
/** 释放点至少要高出槽口这么多（cm），小球才滚得出去。 */
const MIN_RELEASE_DROP_CM = 0.5;

/** 小球停在挡板上的时长（s，仿真时间）。 */
const LANDED_DWELL_S = 0.14;
/** 描迹动画时长（s，仿真时间）。 */
const TRACE_DURATION_S = 0.45;
const MAX_SUBSTEP_S = 1 / 480;
const SAME_VALUE_EPS = 1e-6;

export type ProjectileLabPhase =
  | 'idle'
  | 'rolling'
  | 'flying'
  | 'landed'
  | 'tracing';

export type ProjectileLabParams = {
  /** 释放点沿斜槽刻度的高度 h（cm，斜槽调平时即相对槽口的高度）。 */
  releaseH: number;
  /** 挡板位置：小球落在挡板上时球心的 y 坐标（cm）。 */
  plateY: number;
  /** 是否显示器材标注。 */
  showLabels: boolean;
  /** 是否用定位卡固定释放位置；不用时每次释放高度有随机偏差。 */
  useLocator: boolean;
  /** 斜槽末端倾角（°，正值上翘，0 为调平）。 */
  chuteTilt: number;
  /** 是否在白纸上记下抛出点 O；不记时以轨迹上的 A 点为坐标原点。 */
  recordOrigin: boolean;
};

export type ProjectileLabMark = {
  x: number;
  y: number;
  /** 留下该落点时的实际释放高度（cm）与斜槽倾角（°）。 */
  releaseH: number;
  tilt: number;
};

export type ProjectileLabMeasurePoint = {
  label: string;
  /** 白纸坐标（cm，相对抛出点 O）。读数 = 该坐标 − axesOrigin。 */
  x: number;
  y: number;
};

/** 描出的轨迹 y = a·x + b·x²（cm，相对抛出点 O）。 */
export type ProjectileLabCurve = { a: number; b: number };

export type ProjectileLabGate = { ok: true } | { ok: false; reason: string };

export type ProjectileLabState = {
  params: ProjectileLabParams;
  phase: ProjectileLabPhase;
  busy: boolean;
  /** 小球球心（cm）。 */
  ball: { x: number; y: number };
  /** 本次飞行已走过的球心轨迹（cm）。 */
  flightTrail: Array<{ x: number; y: number }>;
  marks: ProjectileLabMark[];
  releaseCount: number;
  /** 已留下落点的不同挡板高度数。 */
  levelCount: number;
  /** 纸上全部落点是否来自同一释放高度与同一斜槽倾角。 */
  consistent: boolean;
  traced: boolean;
  /** 描迹动画进度 0–1。 */
  traceProgress: number;
  curve: ProjectileLabCurve | null;
  /** 坐标原点在白纸上的位置：记录了抛出点时为 O(0,0)，否则为 A 点。 */
  axesOrigin: { x: number; y: number };
  measurePoints: ProjectileLabMeasurePoint[];
  traceGate: ProjectileLabGate;
  releaseGate: ProjectileLabGate;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 斜槽绕槽口 O 转过 tiltDeg（末端上翘为正）后，槽上一点的白纸坐标。 */
export function rotateAboutEnd(
  point: { x: number; y: number },
  tiltDeg: number
): { x: number; y: number } {
  const a = toRad(tiltDeg);
  return {
    x: point.x * Math.cos(a) + point.y * Math.sin(a),
    y: -point.x * Math.sin(a) + point.y * Math.cos(a)
  };
}

/** 释放高度 h 对应的圆弧角（自最低点起算，rad）。 */
export function releaseAngle(releaseHCm: number): number {
  const ratio = 1 - releaseHCm / CHUTE_RADIUS_CM;
  return Math.acos(Math.max(-1, Math.min(1, ratio)));
}

/** 调平时圆弧段上角度 θ 处的球心坐标（cm）。θ = 0 为圆弧最低点。 */
export function chutePoint(theta: number): { x: number; y: number } {
  return {
    x: -CHUTE_FLAT_CM - CHUTE_RADIUS_CM * Math.sin(theta),
    y: -CHUTE_RADIUS_CM * (1 - Math.cos(theta))
  };
}

/** 释放点高出槽口的竖直高度（cm）；斜槽倾斜时不等于刻度 h。 */
export function releaseDropCm(releaseHCm: number, tiltDeg = 0): number {
  return -rotateAboutEnd(chutePoint(releaseAngle(releaseHCm)), tiltDeg).y;
}

/**
 * 实心球沿斜槽无滑滚下后的出射速率（cm/s）。
 * 机械能守恒：mgH = ½mv² + ½·(2/5·mr²)·(v/r)² = (7/10)·mv²，H 为竖直落差。
 */
export function launchSpeedCmS(releaseHCm: number, tiltDeg = 0): number {
  const drop = Math.max(0, releaseDropCm(Math.max(0, releaseHCm), tiltDeg));
  return Math.sqrt((10 * G_CMS2 * drop) / 7);
}

/**
 * 以速率 v、仰角 tiltDeg 离开槽口后，球心下落到 y（cm）所用时间（s）。
 * 解 ½gt² − v·sinα·t − y = 0 的正根；α = 0 时即 √(2y/g)。
 */
export function flightTimeS(yCm: number, speedCmS = 0, tiltDeg = 0): number {
  const up = speedCmS * Math.sin(toRad(tiltDeg));
  return (up + Math.sqrt(up * up + 2 * G_CMS2 * Math.max(0, yCm))) / G_CMS2;
}

/** 理想落点横坐标（cm）。调平时 x = v₀·√(2y/g)。 */
export function landingXCm(
  releaseHCm: number,
  plateYCm: number,
  tiltDeg = 0
): number {
  const speed = launchSpeedCmS(releaseHCm, tiltDeg);
  return (
    speed * Math.cos(toRad(tiltDeg)) * flightTimeS(plateYCm, speed, tiltDeg)
  );
}

/** 由一组坐标（cm，相对抛出点）求初速度（m/s）：v₀ = x·√(g / 2y)。 */
export function launchSpeedFromPointMs(xCm: number, yCm: number): number {
  if (!(yCm > 0)) return Number.NaN;
  return (xCm / 100) * Math.sqrt(G_MS2 / ((2 * yCm) / 100));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return Math.round(clamped / step) * step;
}

/** 读数网格：估读到 0.01 cm。 */
function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type LevelGroup = { y: number; x: number };

/** 按挡板高度分组，取每组落点横坐标的平均值，按 y 升序。 */
export function groupMarksByLevel(
  marks: ReadonlyArray<{ x: number; y: number }>
): LevelGroup[] {
  const groups = new Map<number, { sum: number; count: number }>();
  for (const mark of marks) {
    const key = Math.round(mark.y / PLATE_Y_STEP_CM);
    const group = groups.get(key) ?? { sum: 0, count: 0 };
    group.sum += mark.x;
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      y: key * PLATE_Y_STEP_CM,
      x: group.sum / group.count
    }))
    .sort((a, b) => a.y - b.y);
}

/**
 * 过抛出点的平滑曲线 y = a·x + b·x² 的最小二乘拟合。
 * 斜槽调平时 a ≈ 0；末端不水平时 a = −tanα。
 */
export function fitTrajectory(
  points: ReadonlyArray<{ x: number; y: number }>
): ProjectileLabCurve | null {
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let t1 = 0;
  let t2 = 0;
  for (const { x, y } of points) {
    const x2 = x * x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    t1 += x * y;
    t2 += x2 * y;
  }
  if (!(s4 > 0)) return null;
  const det = s2 * s4 - s3 * s3;
  if (Math.abs(det) > 1e-9 * s2 * s4) {
    const a = (t1 * s4 - t2 * s3) / det;
    const b = (s2 * t2 - s3 * t1) / det;
    if (b > 0) return { a, b };
  }
  return { a: 0, b: t2 / s4 };
}

export function curveY(curve: ProjectileLabCurve, xCm: number): number {
  return curve.a * xCm + curve.b * xCm * xCm;
}

/**
 * 选定测量点与坐标原点。
 * - 记录了抛出点：原点为 O，从各高度的平均落点中均匀取 5 个。
 * - 未记录抛出点：以轨迹上第一个落点处为 A（原点），沿 x 方向等间距
 *   在轨迹上取 A–E，供 Δy = gT² 法使用。
 * 读数（相对原点）都落在 0.01 cm 网格上。
 */
export function pickMeasurePoints(
  groups: ReadonlyArray<LevelGroup>,
  curve: ProjectileLabCurve | null,
  recordOrigin: boolean
): {
  origin: { x: number; y: number };
  points: ProjectileLabMeasurePoint[];
} {
  const origin = { x: 0, y: 0 };
  if (groups.length < MEASURE_POINT_COUNT || !curve) {
    return { origin, points: [] };
  }
  const last = groups.length - 1;
  if (recordOrigin) {
    return {
      origin,
      points: MEASURE_POINT_LABELS.map((label, i) => {
        const group =
          groups[Math.round((i * last) / (MEASURE_POINT_COUNT - 1))]!;
        return { label, x: roundCm(group.x), y: roundCm(group.y) };
      })
    };
  }
  const ox = roundCm(groups[0]!.x);
  const oy = roundCm(curveY(curve, ox));
  const span = (groups[last]!.x - ox) / (MEASURE_POINT_COUNT - 1);
  const dx = Math.max(0.5, Math.floor(span * 2) / 2);
  return {
    origin: { x: ox, y: oy },
    points: MEASURE_POINT_LABELS.map((label, i) => {
      const x = ox + i * dx;
      return { label, x, y: oy + roundCm(curveY(curve, x) - oy) };
    })
  };
}

export function createProjectileLabSim(
  initial: Partial<ProjectileLabParams> = {},
  options: { seed?: number } = {}
) {
  const seed = options.seed ?? 20261007;
  let rng = createRng(seed);
  let params: ProjectileLabParams = {
    releaseH: snap(
      initial.releaseH ?? 8,
      RELEASE_H_MIN_CM,
      RELEASE_H_MAX_CM,
      RELEASE_H_STEP_CM
    ),
    plateY: snap(
      initial.plateY ?? PLATE_Y_MIN_CM,
      PLATE_Y_MIN_CM,
      PLATE_Y_MAX_CM,
      PLATE_Y_STEP_CM
    ),
    showLabels: initial.showLabels ?? true,
    useLocator: initial.useLocator ?? true,
    chuteTilt: snap(
      initial.chuteTilt ?? 0,
      -CHUTE_TILT_MAX_DEG,
      CHUTE_TILT_MAX_DEG,
      1
    ),
    recordOrigin: initial.recordOrigin ?? true
  };

  let phase: ProjectileLabPhase = 'idle';
  // 本次释放的运动学状态。
  let theta = 0;
  let omega = 0;
  let onFlat = false;
  let flatS = 0;
  let flatV = 0;
  let flightT = 0;
  let launchV = 0;
  let runH = params.releaseH;
  let dwell = 0;
  let ball = { x: 0, y: 0 };
  let flightTrail: Array<{ x: number; y: number }> = [];
  let marks: ProjectileLabMark[] = [];
  let releaseCount = 0;
  let traced = false;
  let traceProgress = 0;
  let curve: ProjectileLabCurve | null = null;
  let axesOrigin = { x: 0, y: 0 };
  let measurePoints: ProjectileLabMeasurePoint[] = [];

  function restPoint(): { x: number; y: number } {
    return rotateAboutEnd(
      chutePoint(releaseAngle(params.releaseH)),
      params.chuteTilt
    );
  }

  function restBall(): void {
    phase = 'idle';
    ball = restPoint();
    flightTrail = [];
  }
  restBall();

  function isConsistent(): boolean {
    const first = marks[0];
    if (!first) return true;
    return marks.every(
      (mark) =>
        Math.abs(mark.releaseH - first.releaseH) < SAME_VALUE_EPS &&
        mark.tilt === first.tilt
    );
  }

  function traceGate(): ProjectileLabGate {
    if (traced) return { ok: false, reason: '轨迹已描出' };
    if (phase !== 'idle') return { ok: false, reason: '小球运动中，请稍候' };
    const missing = MEASURE_POINT_COUNT - groupMarksByLevel(marks).length;
    if (missing > 0) {
      return { ok: false, reason: `还需 ${missing} 个不同高度的落点` };
    }
    return { ok: true };
  }

  function releaseGate(): ProjectileLabGate {
    if (phase !== 'idle') return { ok: false, reason: '小球运动中，请稍候' };
    if (traced) {
      return { ok: false, reason: '轨迹已描好，换白纸后才能继续释放' };
    }
    if (
      releaseDropCm(params.releaseH, params.chuteTilt) < MIN_RELEASE_DROP_CM
    ) {
      return { ok: false, reason: '释放点不比槽口高，小球滚不出去' };
    }
    return { ok: true };
  }

  function deriveMeasurePoints(): void {
    const groups = groupMarksByLevel(marks);
    curve = fitTrajectory(groups);
    const picked = pickMeasurePoints(groups, curve, params.recordOrigin);
    axesOrigin = picked.origin;
    measurePoints = picked.points;
  }

  function land(): void {
    const tilt = toRad(params.chuteTilt);
    const t = flightTimeS(params.plateY, launchV, params.chuteTilt);
    const mark = {
      x: launchV * Math.cos(tilt) * t,
      y: params.plateY,
      releaseH: runH,
      tilt: params.chuteTilt
    };
    ball = { x: mark.x, y: mark.y };
    flightTrail.push({ ...ball });
    marks.push(mark);
    phase = 'landed';
    dwell = 0;
  }

  function substep(dt: number): void {
    const tilt = toRad(params.chuteTilt);
    // 无滑滚动沿槽面的加速度 a = (5/7)·g·sin(坡角)。
    const rollG = (5 * G_CMS2) / 7;
    if (phase === 'rolling') {
      if (!onFlat) {
        omega += (rollG / CHUTE_RADIUS_CM) * Math.sin(theta - tilt) * dt;
        theta -= omega * dt;
        if (theta <= 0) {
          theta = 0;
          onFlat = true;
          flatS = -CHUTE_FLAT_CM;
          // 圆弧最低点的速率由能量守恒给出（该点比槽口低 FLAT·sinα）。
          const drop =
            releaseDropCm(runH, params.chuteTilt) +
            CHUTE_FLAT_CM * Math.sin(tilt);
          flatV = Math.sqrt((10 * G_CMS2 * Math.max(0, drop)) / 7);
        }
        ball = rotateAboutEnd(chutePoint(theta), params.chuteTilt);
      } else {
        flatV = Math.max(launchV * 0.5, flatV - rollG * Math.sin(tilt) * dt);
        flatS += flatV * dt;
        ball = rotateAboutEnd(
          { x: Math.min(0, flatS), y: 0 },
          params.chuteTilt
        );
        if (flatS >= 0) {
          phase = 'flying';
          flightT = flatS / launchV;
          flightTrail = [{ x: 0, y: 0 }];
        }
      }
      return;
    }
    if (phase === 'flying') {
      flightT += dt;
      if (flightT >= flightTimeS(params.plateY, launchV, params.chuteTilt)) {
        land();
        return;
      }
      ball = {
        x: launchV * Math.cos(tilt) * flightT,
        y:
          -launchV * Math.sin(tilt) * flightT + 0.5 * G_CMS2 * flightT * flightT
      };
      flightTrail.push({ ...ball });
      return;
    }
    if (phase === 'landed') {
      dwell += dt;
      if (dwell >= LANDED_DWELL_S) restBall();
      return;
    }
    if (phase === 'tracing') {
      traceProgress = Math.min(1, traceProgress + dt / TRACE_DURATION_S);
      if (traceProgress >= 1) phase = 'idle';
    }
  }

  function clearPaper(): void {
    marks = [];
    releaseCount = 0;
    traced = false;
    traceProgress = 0;
    curve = null;
    axesOrigin = { x: 0, y: 0 };
    measurePoints = [];
    restBall();
  }

  return {
    getParams(): ProjectileLabParams {
      return { ...params };
    },
    setParams(next: Partial<ProjectileLabParams>): ProjectileLabParams {
      const num = (value: unknown): value is number =>
        typeof value === 'number' && Number.isFinite(value);
      const bool = (value: unknown, fallback: boolean): boolean =>
        typeof value === 'boolean' ? value : fallback;
      const before = params;
      params = {
        releaseH: num(next.releaseH)
          ? snap(
              next.releaseH,
              RELEASE_H_MIN_CM,
              RELEASE_H_MAX_CM,
              RELEASE_H_STEP_CM
            )
          : before.releaseH,
        plateY: num(next.plateY)
          ? snap(next.plateY, PLATE_Y_MIN_CM, PLATE_Y_MAX_CM, PLATE_Y_STEP_CM)
          : before.plateY,
        chuteTilt: num(next.chuteTilt)
          ? snap(next.chuteTilt, -CHUTE_TILT_MAX_DEG, CHUTE_TILT_MAX_DEG, 1)
          : before.chuteTilt,
        showLabels: bool(next.showLabels, before.showLabels),
        useLocator: bool(next.useLocator, before.useLocator),
        recordOrigin: bool(next.recordOrigin, before.recordOrigin)
      };
      const moved =
        params.releaseH !== before.releaseH ||
        params.plateY !== before.plateY ||
        params.chuteTilt !== before.chuteTilt ||
        params.useLocator !== before.useLocator;
      // 运动途中改动器材：本次释放作废，不留落点。
      if (moved && phase !== 'tracing') restBall();
      // 已描迹后改变是否记录抛出点：坐标原点与测量点随之重定。
      if (traced && params.recordOrigin !== before.recordOrigin) {
        deriveMeasurePoints();
      }
      return { ...params };
    },
    /** 由静止释放小球：有定位卡时位置固定，没有时带随机偏差。 */
    release(): ProjectileLabGate {
      const gate = releaseGate();
      if (!gate.ok) return gate;
      runH = params.useLocator
        ? params.releaseH
        : Math.max(
            RELEASE_H_MIN_CM - 1,
            Math.min(
              RELEASE_H_MAX_CM + 1,
              params.releaseH + (rng() * 2 - 1) * LOOSE_RELEASE_SPREAD_CM
            )
          );
      theta = releaseAngle(runH);
      omega = 0;
      onFlat = false;
      launchV =
        launchSpeedCmS(runH, params.chuteTilt) *
        (1 + (rng() * 2 - 1) * LAUNCH_JITTER);
      if (!(launchV > 0)) {
        return { ok: false, reason: '释放点不比槽口高，小球滚不出去' };
      }
      releaseCount += 1;
      phase = 'rolling';
      ball = rotateAboutEnd(chutePoint(theta), params.chuteTilt);
      flightTrail = [];
      return { ok: true };
    },
    /** 挡板下移一格；已到最低处时返回 false。 */
    lowerPlate(): boolean {
      if (params.plateY >= PLATE_Y_MAX_CM) return false;
      const plateY = Math.min(
        PLATE_Y_MAX_CM,
        params.plateY + PLATE_LOWER_STEP_CM
      );
      params = { ...params, plateY };
      if (phase !== 'tracing') restBall();
      return true;
    },
    /** 取下白纸，用平滑曲线连接各落点并标出测量点。 */
    trace(): ProjectileLabGate {
      const gate = traceGate();
      if (!gate.ok) return gate;
      deriveMeasurePoints();
      traced = true;
      traceProgress = 0;
      phase = 'tracing';
      return { ok: true };
    },
    /** 换一张白纸：清空落点与轨迹。 */
    newPaper(): void {
      clearPaper();
    },
    step(dt: number): void {
      if (!(dt > 0)) return;
      const busy = (): boolean => phase !== 'idle';
      let remaining = Math.min(dt, 0.1);
      while (remaining > 1e-12 && busy()) {
        const h = Math.min(MAX_SUBSTEP_S, remaining);
        substep(h);
        remaining -= h;
      }
    },
    reset(): void {
      rng = createRng(seed);
      clearPaper();
    },
    getState(): ProjectileLabState {
      return {
        params: { ...params },
        phase,
        busy: phase !== 'idle',
        ball: { ...ball },
        flightTrail: flightTrail.map((point) => ({ ...point })),
        marks: marks.map((mark) => ({ ...mark })),
        releaseCount,
        levelCount: groupMarksByLevel(marks).length,
        consistent: isConsistent(),
        traced,
        traceProgress,
        curve: curve ? { ...curve } : null,
        axesOrigin: { ...axesOrigin },
        measurePoints: measurePoints.map((point) => ({ ...point })),
        traceGate: traceGate(),
        releaseGate: releaseGate()
      };
    }
  };
}

export type ProjectileLabSim = ReturnType<typeof createProjectileLabSim>;
