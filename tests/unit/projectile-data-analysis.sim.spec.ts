import { describe, expect, it } from 'vitest';
import {
  CHUTE_FLAT_CM,
  CHUTE_RADIUS_CM,
  LAUNCH_JITTER,
  MEASURE_POINT_COUNT,
  createProjectileLabSim,
  curveY,
  fitTrajectory,
  flightTimeS,
  landingXCm,
  launchSpeedCmS,
  launchSpeedFromPointMs,
  releaseDropCm,
  type ProjectileLabSim
} from '../../src/scenes/projectile-data-analysis/scene.sim';

/** 推进到小球回到释放位置（或描迹结束）。 */
function settle(sim: ProjectileLabSim): void {
  for (let i = 0; i < 4000 && sim.getState().busy; i += 1) sim.step(1 / 240);
  expect(sim.getState().busy).toBe(false);
}

function releaseAndSettle(sim: ProjectileLabSim): void {
  expect(sim.release()).toEqual({ ok: true });
  settle(sim);
}

/** 在 5 个高度各留一个落点（6, 12, 18, 24, 30 cm）。 */
function recordFiveLevels(sim: ProjectileLabSim): void {
  for (let i = 0; i < MEASURE_POINT_COUNT; i += 1) {
    releaseAndSettle(sim);
    if (i < MEASURE_POINT_COUNT - 1) expect(sim.lowerPlate()).toBe(true);
  }
}

function traced(params: Parameters<typeof createProjectileLabSim>[0]) {
  const sim = createProjectileLabSim({ releaseH: 8, plateY: 6, ...params });
  recordFiveLevels(sim);
  expect(sim.trace()).toEqual({ ok: true });
  settle(sim);
  return sim;
}

describe('projectile lab physics', () => {
  it('launch speed follows rolling-sphere energy conservation', () => {
    // mgh = (7/10)·m·v² → v = √(10·9.8·0.08 / 7) = √1.12 = 1.0583 m/s
    expect(launchSpeedCmS(8)).toBeCloseTo(105.83, 2);
    // 高度变为 4 倍，速度变为 2 倍
    expect(launchSpeedCmS(12) / launchSpeedCmS(3)).toBeCloseTo(2, 10);
  });

  it('flight time and landing point follow y = ½gt², x = v₀t', () => {
    // y = 19.6 cm → t = √(2·0.196 / 9.8) = 0.2 s
    expect(flightTimeS(19.6)).toBeCloseTo(0.2, 10);
    // x = 1.0583 m/s × 0.2 s = 21.166 cm
    expect(landingXCm(8, 19.6)).toBeCloseTo(21.166, 2);
  });

  it('a tilted chute launches obliquely', () => {
    // 调平时落差就是刻度 h；末端上翘时释放点相对槽口变低
    expect(releaseDropCm(8, 0)).toBeCloseTo(8, 10);
    expect(releaseDropCm(8, 5)).toBeLessThan(8);
    expect(releaseDropCm(8, -5)).toBeGreaterThan(8);
    // 斜抛：v = 100 cm/s、仰角 30°，落回抛出高度用时 2v·sin30°/g = 100/980 s
    expect(flightTimeS(0, 100, 30)).toBeCloseTo(100 / 980, 10);
    // 下落 y 后满足 y = −v·sinα·t + ½gt²
    const t = flightTimeS(20, 100, 30);
    expect(-100 * 0.5 * t + 0.5 * 980 * t * t).toBeCloseTo(20, 9);
  });

  it('recovers v₀ from one trajectory point', () => {
    // x = 21.166 cm, y = 19.6 cm → v₀ = 0.21166 / 0.2 = 1.0583 m/s
    expect(launchSpeedFromPointMs(21.166, 19.6)).toBeCloseTo(1.0583, 4);
    expect(Number.isNaN(launchSpeedFromPointMs(10, 0))).toBe(true);
  });

  it('fits y = a·x + b·x² exactly through points on such a curve', () => {
    const points = [4, 9, 15, 22].map((x) => ({
      x,
      y: -0.1 * x + 0.05 * x * x
    }));
    const curve = fitTrajectory(points)!;
    expect(curve.a).toBeCloseTo(-0.1, 9);
    expect(curve.b).toBeCloseTo(0.05, 9);
    expect(curveY(curve, 10)).toBeCloseTo(4, 9);
    expect(fitTrajectory([])).toBeNull();
  });
});

describe('projectile lab run', () => {
  it('keeps the ball on the chute, then on a parabola, and stamps a mark on the plate', () => {
    const sim = createProjectileLabSim({ releaseH: 8, plateY: 20 });
    expect(sim.release()).toEqual({ ok: true });
    const flight: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 4000 && sim.getState().busy; i += 1) {
      sim.step(1 / 480);
      const state = sim.getState();
      if (state.phase === 'rolling' && state.ball.x < -CHUTE_FLAT_CM) {
        // 圆弧段：球心到圆心 (−FLAT, −R) 的距离恒为 R
        const dx = state.ball.x + CHUTE_FLAT_CM;
        const dy = state.ball.y + CHUTE_RADIUS_CM;
        expect(Math.hypot(dx, dy)).toBeCloseTo(CHUTE_RADIUS_CM, 6);
      }
      if (state.phase === 'flying' && state.ball.x > 1) flight.push(state.ball);
    }
    expect(flight.length).toBeGreaterThan(10);
    // 平抛轨迹：y / x² = g / (2v₀²) = 980 / (2·105.83²) = 0.04375 cm⁻¹
    for (const point of flight) {
      expect(point.y / (point.x * point.x)).toBeCloseTo(0.04375, 3);
    }

    const state = sim.getState();
    expect(state.marks).toHaveLength(1);
    expect(state.marks[0]!.y).toBe(20);
    // 理想落点 x = 105.83 × √(40/980) = 21.381 cm，涨落不超过 LAUNCH_JITTER
    expect(Math.abs(state.marks[0]!.x - 21.381)).toBeLessThan(
      21.381 * LAUNCH_JITTER + 0.005
    );
    expect(state.phase).toBe('idle');
  });

  it('repeated releases with the locator land on the same spot', () => {
    const sim = createProjectileLabSim({ releaseH: 10, plateY: 30 });
    for (let i = 0; i < 6; i += 1) releaseAndSettle(sim);
    const xs = sim.getState().marks.map((mark) => mark.x);
    expect(xs).toHaveLength(6);
    const spread = Math.max(...xs) - Math.min(...xs);
    expect(spread).toBeLessThan(2 * LAUNCH_JITTER * Math.max(...xs) + 1e-9);
    expect(sim.getState().levelCount).toBe(1);
    expect(sim.getState().consistent).toBe(true);
  });

  it('without the locator the release height wanders and the marks scatter', () => {
    const sim = createProjectileLabSim({
      releaseH: 10,
      plateY: 30,
      useLocator: false
    });
    for (let i = 0; i < 8; i += 1) releaseAndSettle(sim);
    const marks = sim.getState().marks;
    const heights = marks.map((mark) => mark.releaseH);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5);
    expect(Math.max(...heights)).toBeLessThanOrEqual(11.5 + 1e-9);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(8.5 - 1e-9);
    const xs = marks.map((mark) => mark.x);
    // 有定位卡时散布不到 0.3 cm；这里应明显更大
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1);
    expect(sim.getState().consistent).toBe(false);
  });

  it('a tilted chute end shifts the landing point and bends the fitted curve', () => {
    const level = createProjectileLabSim({ releaseH: 8, plateY: 30 });
    const up = createProjectileLabSim({
      releaseH: 8,
      plateY: 30,
      chuteTilt: 6
    });
    releaseAndSettle(level);
    releaseAndSettle(up);
    const mark = up.getState().marks[0]!;
    const ideal = landingXCm(8, 30, 6);
    expect(Math.abs(mark.x - ideal)).toBeLessThan(ideal * 0.01);
    expect(Math.abs(mark.x - level.getState().marks[0]!.x)).toBeGreaterThan(
      0.5
    );

    const sim = traced({ chuteTilt: 6 });
    // 斜抛轨迹 y = −tanα·x + …：一次项系数 = −tan 6° = −0.105
    expect(sim.getState().curve!.a).toBeCloseTo(-0.105, 1);
    // 调平时一次项约为 0
    expect(Math.abs(traced({}).getState().curve!.a)).toBeLessThan(0.02);
  });

  it('a different release position lands elsewhere but tracing stays possible', () => {
    const sim = createProjectileLabSim({ releaseH: 8, plateY: 6 });
    recordFiveLevels(sim);
    sim.setParams({ releaseH: 12 });
    releaseAndSettle(sim);
    const sameLevel = sim.getState().marks.filter((mark) => mark.y === 30);
    expect(sameLevel).toHaveLength(2);
    // v ∝ √h：x 之比 = √(12/8) = 1.2247
    expect(sameLevel[1]!.x / sameLevel[0]!.x).toBeCloseTo(1.2247, 1);
    expect(sim.getState().consistent).toBe(false);
    // 错误操作也能描迹——误差体现在数据里
    expect(sim.trace()).toEqual({ ok: true });
  });

  it('needs five plate heights before the trajectory can be traced', () => {
    const sim = createProjectileLabSim({ releaseH: 8, plateY: 6 });
    releaseAndSettle(sim);
    expect(sim.trace()).toEqual({
      ok: false,
      reason: '还需 4 个不同高度的落点'
    });
  });

  it('with the launch point recorded, measures five marks relative to O', () => {
    const sim = traced({});
    const state = sim.getState();
    expect(state.traced).toBe(true);
    expect(state.traceProgress).toBe(1);
    expect(state.axesOrigin).toEqual({ x: 0, y: 0 });
    // y = b·x²，b = g / (2v₀²) = 0.04375 cm⁻¹
    expect(curveY(state.curve!, 20) / (0.04375 * 400)).toBeCloseTo(1, 1);
    expect(state.measurePoints.map((point) => point.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E'
    ]);
    expect(state.measurePoints.map((point) => point.y)).toEqual([
      6, 12, 18, 24, 30
    ]);
    for (const point of state.measurePoints) {
      // 读数落在 0.01 cm 网格上
      expect(Math.abs(point.x * 100 - Math.round(point.x * 100))).toBeLessThan(
        1e-6
      );
      // 每个测量点都还原出同一个 v₀ ≈ 1.058 m/s
      expect(launchSpeedFromPointMs(point.x, point.y)).toBeCloseTo(1.058, 2);
    }
  });

  it('without the launch point, takes A as origin and spaces A–E evenly in x', () => {
    const sim = traced({ recordOrigin: false });
    const state = sim.getState();
    const [a, b, c, d, e] = state.measurePoints;
    expect(state.axesOrigin).toEqual({ x: a!.x, y: a!.y });
    expect(a!.x).toBeGreaterThan(5);
    const dx = b!.x - a!.x;
    expect(dx).toBeGreaterThanOrEqual(0.5);
    for (const [p, q] of [
      [b, c],
      [c, d],
      [d, e]
    ]) {
      expect(q!.x - p!.x).toBeCloseTo(dx, 9);
    }
    // 等 Δx 的相邻竖直位移之差恒为 gT²，T = Δx / v₀：
    // Δ²y = g·Δx² / v₀² = 980·Δx² / 105.83²
    const expected = (980 * dx * dx) / (105.83 * 105.83);
    expect(c!.y - 2 * b!.y + a!.y).toBeCloseTo(expected, 1);
    expect(e!.y - 2 * d!.y + c!.y).toBeCloseTo(expected, 1);
  });

  it('re-derives the measure points when the origin setting changes after tracing', () => {
    const sim = traced({});
    const full = sim.getState().measurePoints;
    sim.setParams({ recordOrigin: false });
    const state = sim.getState();
    expect(state.axesOrigin.x).toBeGreaterThan(5);
    expect(state.measurePoints).not.toEqual(full);
    sim.setParams({ recordOrigin: true });
    expect(sim.getState().measurePoints).toEqual(full);
  });

  it('locks releases after tracing until the paper is replaced', () => {
    const sim = traced({});
    expect(sim.release().ok).toBe(false);
    sim.newPaper();
    const state = sim.getState();
    expect(state.marks).toEqual([]);
    expect(state.traced).toBe(false);
    expect(state.measurePoints).toEqual([]);
    expect(sim.release()).toEqual({ ok: true });
  });

  it('changing the apparatus mid-flight voids that release', () => {
    const sim = createProjectileLabSim({ releaseH: 8, plateY: 20 });
    sim.release();
    sim.step(0.05);
    expect(sim.getState().busy).toBe(true);
    sim.setParams({ plateY: 25 });
    expect(sim.getState().busy).toBe(false);
    expect(sim.getState().marks).toEqual([]);
  });

  it('snaps and clamps apparatus settings', () => {
    const sim = createProjectileLabSim();
    expect(
      sim.setParams({ releaseH: 7.3, plateY: 100, chuteTilt: 20 })
    ).toMatchObject({ releaseH: 7.5, plateY: 42, chuteTilt: 8 });
    expect(sim.lowerPlate()).toBe(false);
    expect(sim.setParams({ releaseH: 0 }).releaseH).toBe(4);
  });

  it('reset reproduces the same marks', () => {
    const sim = createProjectileLabSim({ releaseH: 8, plateY: 20 });
    releaseAndSettle(sim);
    const first = sim.getState().marks[0]!.x;
    sim.reset();
    expect(sim.getState().marks).toEqual([]);
    releaseAndSettle(sim);
    expect(sim.getState().marks[0]!.x).toBe(first);
  });
});
