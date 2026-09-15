import { describe, expect, it } from 'vitest';
import {
  createForceCompositionSim,
  diagramFitScale,
  inclineGeometry,
  pointLineDistance,
  pointerToBaseNorm,
  resultantMagnitude,
  stageTransform,
  vectorMagnitude
} from '../../src/scenes/force-composition/scene.sim';

const defaults = {
  tab: 'synthesis' as const,
  rule: 'parallelogram' as const,
  f1: 40,
  f2: 30,
  angle: 60,
  orthogonalF: 55,
  orthogonalAngle: 60,
  gravity: 40,
  inclineAngle: 30,
  rangeSweep: false
};

describe('force-composition sim', () => {
  it('uses the cosine law for the resultant', () => {
    const sim = createForceCompositionSim(defaults);
    const state = sim.getState();
    const expected = Math.sqrt(40 * 40 + 30 * 30 + 2 * 40 * 30 * 0.5);
    expect(vectorMagnitude(state.resultant)).toBeCloseTo(expected, 8);
    expect(resultantMagnitude(40, 30, 60)).toBeCloseTo(expected, 8);
  });

  it('keeps the resultant range between difference and sum', () => {
    const sim = createForceCompositionSim({ ...defaults, tab: 'range' });
    const state = sim.getState();
    const magnitude = vectorMagnitude(state.resultant);
    expect(magnitude).toBeGreaterThanOrEqual(
      Math.abs(defaults.f1 - defaults.f2)
    );
    expect(magnitude).toBeLessThanOrEqual(defaults.f1 + defaults.f2);
  });

  it('resolves an orthogonal force into perpendicular components', () => {
    const sim = createForceCompositionSim(defaults);
    sim.setParams({
      tab: 'orthogonal',
      orthogonalF: 50,
      orthogonalAngle: 36.869897
    });
    const state = sim.getState();
    expect(state.fx.x).toBeCloseTo(40, 5);
    expect(state.fy.y).toBeCloseTo(30, 5);
    expect(vectorMagnitude({ x: state.fx.x, y: state.fy.y })).toBeCloseTo(
      50,
      5
    );
  });

  it('resolves gravity along and normal to an incline', () => {
    const sim = createForceCompositionSim({ ...defaults, tab: 'effect' });
    const state = sim.getState();
    expect(state.g1.x + state.g2.x).toBeCloseTo(0, 8);
    expect(state.g1.y + state.g2.y).toBeCloseTo(-defaults.gravity, 8);
    expect(vectorMagnitude(state.g1)).toBeCloseTo(
      defaults.gravity * Math.sin((30 * Math.PI) / 180),
      8
    );
    expect(vectorMagnitude(state.g2)).toBeCloseTo(
      defaults.gravity * Math.cos((30 * Math.PI) / 180),
      8
    );
  });

  it('clamps invalid values and reset restores the initial parameters', () => {
    const sim = createForceCompositionSim(defaults);
    sim.setParams({ f1: 999, angle: -20, inclineAngle: 99 });
    expect(sim.getParams().f1).toBe(60);
    expect(sim.getParams().angle).toBe(0);
    expect(sim.getParams().inclineAngle).toBe(60);
    sim.reset();
    expect(sim.getParams()).toEqual(defaults);
    expect(sim.getState().t).toBe(0);
  });

  it('advances time and sweeps the range angle only when enabled', () => {
    const sim = createForceCompositionSim({
      ...defaults,
      tab: 'range',
      rangeSweep: true
    });
    sim.step(0.5);
    expect(sim.getState().t).toBeCloseTo(0.5);
    expect(sim.getParams().angle).not.toBe(defaults.angle);
  });

  it('treats 0 / "false" as rangeSweep off so URL numeric 0 round-trips', () => {
    const offZero = createForceCompositionSim({
      ...defaults,
      rangeSweep: 0 as unknown as boolean
    });
    expect(offZero.getParams().rangeSweep).toBe(false);
    const offStr = createForceCompositionSim({
      ...defaults,
      rangeSweep: 'false' as unknown as boolean
    });
    expect(offStr.getParams().rangeSweep).toBe(false);
    const on = createForceCompositionSim({ ...defaults, rangeSweep: true });
    on.setParams({ rangeSweep: 0 as unknown as boolean });
    expect(on.getParams().rangeSweep).toBe(false);
  });

  it('picks F2 at the endpoint in 620×660-normalized coordinates', () => {
    const sim = createForceCompositionSim(defaults);
    const state = sim.getState();
    const x = (300 + state.f2.x * 4) / 620;
    const y = (350 - state.f2.y * 4) / 660;
    expect(sim.pickHandle(x, y)).toBe('f2');
  });

  it('does not pick vector handles in the incline-effect tab', () => {
    const sim = createForceCompositionSim({ ...defaults, tab: 'effect' });
    expect(sim.pickHandle(0.48, 0.53, 400)).toBeNull();
  });

  it('snaps dragged magnitude and angle to 1 N / 1°', () => {
    const sim = createForceCompositionSim(defaults);
    const tx = (300 + 40 * 4 * Math.SQRT1_2) / 620;
    const ty = (350 - 40 * 4 * Math.SQRT1_2) / 660;
    sim.moveHandle('f2', tx, ty);
    const p = sim.getParams();
    expect(Number.isInteger(p.f2)).toBe(true);
    expect(Number.isInteger(p.angle)).toBe(true);
    expect(p.f2).toBeGreaterThanOrEqual(10);
    expect(p.angle).toBeGreaterThan(40);
    expect(p.angle).toBeLessThan(50);
  });

  it('fits desktop canvases to the 960×660 SVG stage with a 620 drawing strip', () => {
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.boxW).toBe(960);
    expect(t.drawW).toBe(620);
    expect(t.fit).toBeCloseTo(971 / 960, 6);
    expect(t.offsetX).toBe(0);
  });

  it('shrinks drawing so a 200px overlay does not cover the 620 strip', () => {
    const t = stageTransform(552, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(620 * t.fit).toBeLessThanOrEqual(552 - 212 - 16 + 1e-6);
  });

  it('fits mobile canvases to the 620×660 drawing area when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(620);
    expect(t.fit).toBeCloseTo(Math.min(720 / 620, 500 / 660), 6);
  });

  it('inverts the 960-stage transform; canvas-wide normalize misses origin', () => {
    const cssW = 971;
    const cssH = 831;
    const layout = { floatingReadout: true };
    const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
    const originCssX = offsetX + 300 * fit;
    const originCssY = offsetY + 350 * fit;
    const n = pointerToBaseNorm(originCssX, originCssY, cssW, cssH, layout);
    expect(n.x * 620).toBeCloseTo(300, 6);
    expect(n.y * 660).toBeCloseTo(350, 6);
    const naiveX = (originCssX / cssW) * 620;
    expect(Math.abs(naiveX - 300)).toBeGreaterThan(20);
  });

  it('keeps the 30° wedge near the original SVG points', () => {
    const g = inclineGeometry(30);
    expect(g.rightAngle).toEqual({ x: 140, y: 480 });
    expect(g.baseEnd.x).toBeCloseTo(480, 0);
    expect(g.topEnd.y).toBeCloseTo(283.5, 0);
  });

  it('makes the hypotenuse angle equal the incline parameter at 15/30/60', () => {
    for (const angle of [15, 30, 45, 60]) {
      const g = inclineGeometry(angle);
      const deg =
        (Math.atan2(g.baseEnd.y - g.topEnd.y, g.baseEnd.x - g.topEnd.x) * 180) /
        Math.PI;
      expect(deg).toBeCloseTo(angle, 8);
      expect(g.baseEnd.x).toBeLessThanOrEqual(620);
      expect(g.topEnd.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('places the block center a half-height from the slope', () => {
    for (const angle of [15, 30, 60]) {
      const g = inclineGeometry(angle);
      const dist = pointLineDistance(g.blockCenter, g.topEnd, g.baseEnd);
      expect(dist).toBeCloseTo(g.blockHeight / 2, 8);
    }
  });

  it('resolves gravity parallel and perpendicular to the slope', () => {
    const sim = createForceCompositionSim({
      ...defaults,
      tab: 'effect',
      inclineAngle: 40,
      gravity: 40
    });
    const state = sim.getState();
    const theta = (40 * Math.PI) / 180;
    const g1Mag = vectorMagnitude(state.g1);
    const g2Mag = vectorMagnitude(state.g2);
    expect(g1Mag).toBeCloseTo(40 * Math.sin(theta), 8);
    expect(g2Mag).toBeCloseTo(40 * Math.cos(theta), 8);
    expect(state.g1.x * state.g2.x + state.g1.y * state.g2.y).toBeCloseTo(0, 8);
    expect(state.g1.x / g1Mag).toBeCloseTo(Math.cos(theta), 8);
    expect(state.g1.y / g1Mag).toBeCloseTo(-Math.sin(theta), 8);
    expect(state.g2.x / g2Mag).toBeCloseTo(-Math.sin(theta), 8);
    expect(state.g2.y / g2Mag).toBeCloseTo(-Math.cos(theta), 8);
  });

  it('keeps default geometry unscaled and shrinks only when tips would leave 620', () => {
    const def = createForceCompositionSim(defaults);
    expect(diagramFitScale(def.getState())).toBe(1);
    const wide = createForceCompositionSim({
      ...defaults,
      f1: 60,
      f2: 60,
      angle: 0
    });
    expect(diagramFitScale(wide.getState())).toBeLessThan(1);
    expect(diagramFitScale(wide.getState())).toBeGreaterThanOrEqual(0.45);
  });
});
