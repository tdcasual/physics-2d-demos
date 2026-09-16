import { describe, expect, it } from 'vitest';
import { createVerticalCircleScene } from '../../src/scenes/vertical-circle/scene.entry';
import {
  createVerticalCircleSim,
  hasFloatingReadout,
  normalizeAngle,
  positionAtAngle,
  stageLayoutFrom,
  stageTransform,
  verticalCircleConstants as C,
  verticalCircleConstraintForce,
  verticalCircleCriticalBottomSpeed,
  verticalCircleCriticalTopSpeed,
  verticalCircleGravityRadial,
  verticalCircleGravityTangential,
  verticalCircleSpeedAtAngle,
  verticalCircleTopSpeed,
  verticalCircleTurningAbs
} from '../../src/scenes/vertical-circle/scene.sim';

describe('vertical-circle energy and kinematics', () => {
  it('matches v² = v_bottom² − 2gR(1+cosθ) at θ = 0 / ±90 / ±180', () => {
    // g=10, R=10 → 2gR=200, 4gR=400. v_bottom=25 → 25²=625
    // 最低点 θ=±180, cos=−1, 1+cos=0 → v=25
    expect(verticalCircleSpeedAtAngle(25, 180)).toBeCloseTo(25, 10);
    expect(verticalCircleSpeedAtAngle(25, -180)).toBeCloseTo(25, 10);
    // 最高点 θ=0, 1+cos=2 → v²=625−400=225 → v=15
    expect(verticalCircleSpeedAtAngle(25, 0)).toBe(15);
    expect(verticalCircleTopSpeed(25)).toBe(15);
    // 侧点 θ=±90, 1+cos=1 → v²=625−200=425 → v=√425=5√17
    expect(verticalCircleSpeedAtAngle(25, 90)).toBeCloseTo(20.615528128, 8);
    expect(verticalCircleSpeedAtAngle(25, -90)).toBeCloseTo(20.615528128, 8);
  });

  it('clamps a negative speed-squared to zero instead of NaN', () => {
    // v_bottom=10, 10²=100 < 4gR=400，到不了最高点
    expect(verticalCircleSpeedAtAngle(10, 0)).toBe(0);
    expect(verticalCircleTopSpeed(10)).toBe(0);
    expect(Number.isFinite(verticalCircleSpeedAtAngle(10, 0))).toBe(true);
    // v_bottom=0 停在最低点
    expect(verticalCircleSpeedAtAngle(0, 180)).toBe(0);
    expect(verticalCircleSpeedAtAngle(0, 0)).toBe(0);
  });

  it('places the ball at x=Cx+R sinθ, y=Cy−R cosθ', () => {
    const top = positionAtAngle(0);
    expect(top.x).toBe(C.centerX);
    expect(top.y).toBe(C.centerY - C.orbitRadius);
    const right = positionAtAngle(90);
    expect(right.x).toBe(C.centerX + C.orbitRadius);
    expect(right.y).toBe(C.centerY);
    const bottom = positionAtAngle(180);
    expect(bottom.x).toBe(C.centerX);
    expect(bottom.y).toBe(C.centerY + C.orbitRadius);
    const left = positionAtAngle(-90);
    expect(left.x).toBe(C.centerX - C.orbitRadius);
    expect(left.y).toBe(C.centerY);
    const state = createVerticalCircleSim({
      theta: -51,
      autoRun: false
    }).getState();
    const r = Math.hypot(
      state.position.x - C.centerX,
      state.position.y - C.centerY
    );
    expect(r).toBeCloseTo(C.orbitRadius, 8);
  });
});

describe('vertical-circle constraint and critical speeds', () => {
  it('uses T = mv²/R − mg cosθ at the cardinal angles', () => {
    // m=1, g=10, R=10, v_bottom=25 → v(0)=15, v(180)=25, v(±90)=√425
    // 最高点：T + mg = mv²/R → T=15²/10 − 10 = 22.5 − 10 = 12.5
    expect(verticalCircleConstraintForce(25, 0)).toBe(12.5);
    // 最低点：T − mg = mv²/R → T=25²/10 + 10 = 62.5 + 10 = 72.5
    expect(verticalCircleConstraintForce(25, 180)).toBeCloseTo(72.5, 8);
    expect(verticalCircleConstraintForce(25, -180)).toBeCloseTo(72.5, 8);
    // 侧点 cos=0 → T = mv²/R = 425/10 = 42.5
    expect(verticalCircleConstraintForce(25, 90)).toBeCloseTo(42.5, 8);
    expect(verticalCircleConstraintForce(25, -90)).toBeCloseTo(42.5, 8);
  });

  it('keeps gravity radial/tangential as mg cosθ and mg sinθ', () => {
    expect(verticalCircleGravityRadial(0)).toBe(10);
    expect(verticalCircleGravityTangential(0)).toBe(0);
    expect(verticalCircleGravityRadial(180)).toBe(-10);
    expect(verticalCircleGravityTangential(180)).toBeCloseTo(0, 10);
    expect(verticalCircleGravityRadial(90)).toBeCloseTo(0, 10);
    expect(verticalCircleGravityTangential(90)).toBe(10);
    expect(verticalCircleGravityRadial(-90)).toBeCloseTo(0, 10);
    expect(verticalCircleGravityTangential(-90)).toBe(-10);
  });

  it('sets rope critical speeds to √(gR) and √(5gR), rod top to 0', () => {
    // √(gR)=√100=10；√(5gR)=√500=10√5
    expect(verticalCircleCriticalTopSpeed('rope')).toBe(10);
    expect(verticalCircleCriticalBottomSpeed('rope')).toBeCloseTo(
      22.360679775,
      8
    );
    expect(verticalCircleCriticalTopSpeed('rod')).toBe(0);
    expect(verticalCircleCriticalBottomSpeed('rod')).toBe(0);
    const rope = createVerticalCircleSim({
      model: 'rope',
      vBottom: 25,
      autoRun: false
    }).getState();
    expect(rope.criticalTopSpeed).toBe(10);
    expect(rope.criticalBottomSpeed).toBeCloseTo(22.360679775, 8);
    const rod = createVerticalCircleSim({
      model: 'rod',
      autoRun: false
    }).getState();
    expect(rod.criticalTopSpeed).toBe(0);
    expect(rod.criticalBottomSpeed).toBe(0);
  });

  it('treats T=0 at the rope top as the taut critical, not slack', () => {
    // v_bottom=√500 恰好过最高点：v_top=10, T=10−10=0
    const vCrit = Math.sqrt(500);
    expect(verticalCircleTopSpeed(vCrit)).toBeCloseTo(10, 10);
    expect(verticalCircleConstraintForce(vCrit, 0)).toBeCloseTo(0, 8);
    const sim = createVerticalCircleSim({
      model: 'rope',
      vBottom: vCrit,
      theta: 0,
      autoRun: false
    });
    expect(sim.getState().status).toBe('绳子拉力有效');
  });

  it('marks rope derail at the top when v_top < √(gR)', () => {
    // v_bottom=20 → v_top=0 < 10, T_top=−10
    expect(verticalCircleTopSpeed(20)).toBe(0);
    expect(verticalCircleConstraintForce(20, 0)).toBe(-10);
    const top = createVerticalCircleSim({
      model: 'rope',
      vBottom: 20,
      theta: 0,
      autoRun: false
    });
    expect(top.getState().status).toBe('最高点脱轨');
    // 最低点仍张紧，但过不了最高点
    const bottom = createVerticalCircleSim({
      model: 'rope',
      vBottom: 20,
      theta: 180,
      autoRun: false
    });
    expect(bottom.getState().constraintForce).toBeGreaterThan(0);
    expect(bottom.getState().status).toBe('最高点脱轨');
  });

  it('marks rope slack when dragged above the energy turning height', () => {
    // v_bottom=10, Δh_max=v²/(2g)=100/20=5 m；R(1+cosθ)=5 → cosθ=−0.5 → |θ|=120°
    expect(verticalCircleTurningAbs(10)).toBeCloseTo(120, 8);
    // θ=60° 高于转折点，v 夹取为 0，T=0−mg cos60=−5
    expect(verticalCircleSpeedAtAngle(10, 60)).toBe(0);
    expect(verticalCircleConstraintForce(10, 60)).toBeCloseTo(-5, 10);
    const sim = createVerticalCircleSim({
      model: 'rope',
      vBottom: 10,
      theta: 60,
      autoRun: false
    });
    expect(sim.getState().status).toBe('绳子松弛');
  });

  it('lets a rod carry negative constraint as compression', () => {
    const sim = createVerticalCircleSim({
      model: 'rod',
      vBottom: 20,
      theta: 0,
      autoRun: false
    });
    expect(sim.getState().constraintForce).toBe(-10);
    expect(sim.getState().status).toBe('杆受压');
    const taut = createVerticalCircleSim({
      model: 'rod',
      vBottom: 25,
      theta: 0,
      autoRun: false
    });
    expect(taut.getState().constraintForce).toBe(12.5);
    expect(taut.getState().status).toBe('杆受拉');
  });

  it('matches the cover sample at v_bottom=23.5, θ=−51°', () => {
    // 23.5²=552.25；cos51°≈0.629320391 → 2gR(1+cos)=325.864078
    // v²=226.385922 → v≈15.046 → T=22.6386 − 6.2932 = 16.3454
    expect(verticalCircleSpeedAtAngle(23.5, -51)).toBeCloseTo(15.046, 2);
    expect(verticalCircleConstraintForce(23.5, -51)).toBeCloseTo(16.35, 2);
    expect(verticalCircleTopSpeed(23.5)).toBeCloseTo(12.34, 2);
  });
});

describe('vertical-circle playback, pause, and bounds', () => {
  it('advances along the circle from energy speed and freezes when paused', () => {
    const sim = createVerticalCircleSim({
      vBottom: 25,
      theta: 180,
      autoRun: true
    });
    const before = sim.getState();
    sim.step(0.2);
    const after = sim.getState();
    expect(after.time).toBeCloseTo(0.2, 8);
    expect(after.angle).not.toBe(before.angle);
    const r = Math.hypot(
      after.position.x - C.centerX,
      after.position.y - C.centerY
    );
    expect(r).toBeCloseTo(C.orbitRadius, 6);
    // Δθ ≈ (v/R) Δt in rad → deg. 最低点 v=25, R=10 → 2.5 rad/s × 0.2 × 180/π
    expect(
      Math.abs(normalizeAngle(after.angle - before.angle))
    ).toBeGreaterThan(20);

    sim.setParams({ autoRun: false });
    const frozen = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBe(frozen.time);
    expect(sim.getState().angle).toBe(frozen.angle);
  });

  it('ignores NaN and non-positive dt and stays finite at t=0', () => {
    const sim = createVerticalCircleSim({ autoRun: true });
    const start = sim.getState();
    expect(start.time).toBe(0);
    expect(Number.isFinite(start.speed)).toBe(true);
    expect(Number.isFinite(start.constraintForce)).toBe(true);
    expect(Number.isFinite(start.position.x)).toBe(true);
    sim.step(Number.NaN);
    sim.step(-2);
    sim.step(0);
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().angle).toBe(start.angle);
  });

  it('reverses before the turning angle when energy cannot reach the top', () => {
    // v_bottom=15, Δh_max=225/20=11.25 m → 10(1+cosθ)=11.25 → cosθ=0.125
    // |θ|_min = arccos(0.125) ≈ 82.819°
    expect(verticalCircleTurningAbs(15)).toBeCloseTo(82.819244218, 6);
    const sim = createVerticalCircleSim({
      vBottom: 15,
      theta: 180,
      autoRun: true
    });
    const absAngles: number[] = [];
    for (let i = 0; i < 80; i += 1) {
      sim.step(0.05);
      absAngles.push(Math.abs(sim.getState().angle));
    }
    expect(Math.min(...absAngles)).toBeGreaterThan(82.5);
    expect(sim.getState().speed).toBeGreaterThanOrEqual(0);
  });

  it('does not jump off the circle across a large time step', () => {
    const sim = createVerticalCircleSim({
      vBottom: 23.5,
      theta: -51,
      autoRun: true
    });
    sim.step(1.5);
    const state = sim.getState();
    expect(
      Math.hypot(state.position.x - C.centerX, state.position.y - C.centerY)
    ).toBeCloseTo(C.orbitRadius, 6);
    expect(Number.isFinite(state.angle)).toBe(true);
    expect(state.speed).toBeGreaterThanOrEqual(0);
  });
});

describe('vertical-circle controls, drag, and reset', () => {
  it('clamps v_bottom, wraps θ, and accepts 0/1 flags', () => {
    const sim = createVerticalCircleSim({
      vBottom: 99,
      theta: 999,
      autoRun: 0 as unknown as boolean,
      showVectors: 'false' as unknown as boolean,
      showPath: 0 as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      vBottom: 35,
      theta: -81,
      autoRun: false,
      showVectors: false,
      showPath: false
    });
    sim.setParams({
      model: 1 as unknown as 'rod',
      vBottom: -4,
      autoRun: '1' as unknown as boolean,
      showVectors: 1 as unknown as boolean,
      showPath: 'true' as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      model: 'rod',
      vBottom: 0,
      autoRun: true,
      showVectors: true,
      showPath: true
    });
  });

  it('drags the ball only in θ and keeps it on the orbit', () => {
    const sim = createVerticalCircleSim({ autoRun: false });
    sim.setParams({ theta: 0 });
    expect(
      sim.pickHandle(
        C.centerX / C.baseWidth,
        (C.centerY - C.orbitRadius) / C.baseHeight
      )
    ).toBe('ball');
    expect(sim.pickHandle(0.02, 0.02)).toBeNull();
    sim.moveHandle(
      'ball',
      C.centerX / C.baseWidth,
      (C.centerY + C.orbitRadius) / C.baseHeight
    );
    expect(sim.getParams().theta).toBeCloseTo(180, 8);
    sim.moveHandle(
      'ball',
      (C.centerX + C.orbitRadius) / C.baseWidth,
      C.centerY / C.baseHeight
    );
    expect(sim.getParams().theta).toBeCloseTo(90, 8);
    const pos = sim.getState().position;
    expect(Math.hypot(pos.x - C.centerX, pos.y - C.centerY)).toBeCloseTo(
      C.orbitRadius,
      8
    );
  });

  it('resets to construction defaults and leaves display flags out of the physics', () => {
    const sim = createVerticalCircleSim();
    sim.setParams({
      model: 'rod',
      vBottom: 10,
      theta: 90,
      autoRun: false,
      showVectors: false,
      showPath: false
    });
    sim.stepFrame(0.4);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      model: 'rope',
      vBottom: 23.5,
      theta: -51,
      autoRun: true,
      showVectors: true,
      showPath: true
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().sense).toBe(1);
    expect(sim.getSnapshot()).toEqual(sim.getState());

    const hidden = createVerticalCircleSim({
      showVectors: false,
      showPath: false,
      autoRun: false
    });
    const shown = createVerticalCircleSim({
      showVectors: true,
      showPath: true,
      autoRun: false
    });
    expect(hidden.getState().speed).toBe(shown.getState().speed);
    expect(hidden.getState().constraintForce).toBe(
      shown.getState().constraintForce
    );
  });
});

describe('vertical-circle entry readout', () => {
  it('reports model, speeds, constraint, status, and the two formulas', () => {
    const canvas = document.createElement('canvas');
    const scene = createVerticalCircleScene({ canvas });
    scene.setParams({
      model: 'rope',
      vBottom: 25,
      theta: 0,
      autoRun: false
    });
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.model).toBe('绳模型（只能拉）');
    expect(items.vBottom).toBe('25.0 m/s');
    expect(items.vTop).toBe('15.0 m/s');
    expect(items.speed).toBe('15.0 m/s');
    expect(items.constraint).toContain('12.5 N');
    expect(items.status).toBe('绳子拉力有效');
    expect(items.formulaV).toBe('v² = v₀² − 2gR(1+cosθ)');
    expect(items.formulaT).toBe('T = mv²/R − mg cosθ');
    scene.setParams({ model: 'rod', vBottom: 20, theta: 0 });
    const rod = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(rod.model).toBe('杆模型（拉与推）');
    expect(rod.status).toBe('杆受压');
    scene.dispose();
  });
});

describe('vertical-circle stage transform', () => {
  it('fits 720×660 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(720);
    expect(t.boxH).toBe(660);
    expect(t.fit).toBeCloseTo(Math.min(720 / 720, 500 / 660), 6);
    expect(t.offsetX).toBeCloseTo((720 - 720 * t.fit) / 2, 6);
  });

  it('treats mobile-stack as a non-floating readout', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-testid', 'mobile-stack-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(false);
    expect(stageLayoutFrom(canvas)).toEqual({
      floatingReadout: false,
      overlayPx: 0
    });
    root.remove();
  });

  it('keeps the stage left of a desktop floating overlay', () => {
    const root = document.createElement('div');
    root.className = 'split-right-shell';
    root.setAttribute('data-testid', 'split-right-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(true);
    expect(stageLayoutFrom(canvas).overlayPx).toBe(C.overlayFallbackPx);
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 228,
      overlayTopPx: 60,
      overlayHeightPx: 374
    });
    expect(t.offsetX + t.boxW * t.fit).toBeLessThanOrEqual(971 - 228 + 1e-6);
    root.remove();
  });
});
