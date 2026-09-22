import { describe, expect, it } from 'vitest';
import { createSingleSlitScene } from '../../src/scenes/single-slit/scene.entry';
import {
  centralWidthMm,
  createSingleSlitSim,
  detectorXFromNorm,
  diffractionAngleDeg,
  diffractionBeta,
  diffractionIntensity,
  firstMinimumMm,
  graphTickLabel,
  graphY,
  hasFloatingReadout,
  pickDetectorHandle,
  pxToX,
  sincSquared,
  singleSlitConstants as C,
  stageLayoutFrom,
  stageTransform,
  xToPx
} from '../../src/scenes/single-slit/scene.sim';

describe('single-slit Fraunhofer intensity', () => {
  it('keeps sinc² continuous at β = 0 and bounded in [0, 1]', () => {
    expect(sincSquared(0)).toBe(1);
    expect(sincSquared(1e-12)).toBeCloseTo(1, 10);
    expect(sincSquared(-1e-12)).toBeCloseTo(1, 10);
    expect(sincSquared(Math.PI)).toBeCloseTo(0, 12);
    expect(sincSquared(Number.NaN)).toBe(0);
    expect(diffractionIntensity(0, 670, 0.22, 2.4)).toBe(1);
    expect(diffractionBeta(0, 670, 0.22, 2.4)).toBe(0);
    const samples = [-32, -7.31, -1, 0, 1, 7.31, 32].map((x) =>
      diffractionIntensity(x, 670, 0.22, 2.4)
    );
    for (const intensity of samples) {
      expect(Number.isFinite(intensity)).toBe(true);
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    }
  });

  it('places the first dark fringe and central width at x₁ = λL/a', () => {
    // λ=670 nm, a=0.22 mm, L=2.4 m → x₁ = 670e-9·2.4 / 0.22e-3 = 7.309 mm
    expect(firstMinimumMm(670, 0.22, 2.4)).toBeCloseTo(7.31, 2);
    expect(centralWidthMm(670, 0.22, 2.4)).toBeCloseTo(14.62, 2);
    expect(diffractionIntensity(7.31, 670, 0.22, 2.4)).toBeLessThan(0.001);

    // λ=500 nm, a=0.2 mm, L=2 m → x₁ = 500e-9·2 / 0.2e-3 = 5 mm, Δx = 10 mm
    expect(firstMinimumMm(500, 0.2, 2)).toBeCloseTo(5, 8);
    expect(centralWidthMm(500, 0.2, 2)).toBeCloseTo(10, 8);
    expect(diffractionIntensity(5, 500, 0.2, 2)).toBeLessThan(0.001);
  });

  it('widens fringes when λ or L grows and when a shrinks', () => {
    const base = firstMinimumMm(500, 0.2, 2);
    expect(firstMinimumMm(1000, 0.2, 2)).toBeCloseTo(base * 2, 8);
    expect(firstMinimumMm(500, 0.1, 2)).toBeCloseTo(base * 2, 8);
    expect(firstMinimumMm(500, 0.2, 4)).toBeCloseTo(base * 2, 8);
    expect(firstMinimumMm(400, 0.4, 1)).toBeLessThan(base);
  });

  it('links detector x to θ = arctan(x/L) and I(x)', () => {
    // x=7.31 mm, L=2.4 m → θ = arctan(0.00731/2.4) ≈ 0.1745°
    expect(diffractionAngleDeg(7.31, 2.4)).toBeCloseTo(
      (Math.atan(0.00731 / 2.4) * 180) / Math.PI,
      6
    );
    expect(diffractionAngleDeg(0, 2.4)).toBe(0);
    const sim = createSingleSlitSim({
      lambda: 670,
      slitWidth: 0.22,
      distance: 2.4,
      detectorX: 7.31,
      autoScan: false
    });
    const state = sim.getState();
    expect(state.angle).toBeCloseTo(diffractionAngleDeg(7.31, 2.4), 8);
    expect(state.intensity).toBeCloseTo(
      diffractionIntensity(7.31, 670, 0.22, 2.4),
      10
    );
    expect(state.firstMinimum).toBeCloseTo(7.31, 2);
    expect(state.centralWidth).toBeCloseTo(14.62, 2);
    sim.setParams({ detectorX: 0 });
    expect(sim.getState().intensity).toBe(1);
    expect(sim.getState().angle).toBe(0);
  });
});

describe('single-slit scan, pause, reset, and bounds', () => {
  it('scans to the detector walls then reverses', () => {
    const sim = createSingleSlitSim({ detectorX: 31, autoScan: true });
    sim.step(1);
    expect(sim.getState().params.detectorX).toBe(C.detectorMax);
    const afterMax = sim.getState().params.detectorX;
    sim.step(0.5);
    expect(sim.getState().params.detectorX).toBeLessThan(afterMax);
    sim.setParams({ detectorX: -31 });
    sim.step(1);
    expect(sim.getState().params.detectorX).toBe(C.detectorMin);
    sim.step(0.5);
    expect(sim.getState().params.detectorX).toBeGreaterThan(C.detectorMin);
  });

  it('freezes on pause and still allows a forced frame', () => {
    const sim = createSingleSlitSim({ detectorX: 0, autoScan: true });
    sim.step(0.2);
    const moving = sim.getState().params.detectorX;
    expect(moving).toBeGreaterThan(0);
    sim.setParams({ autoScan: false });
    const paused = sim.getState().params.detectorX;
    sim.step(1);
    expect(sim.getState().params.detectorX).toBe(paused);
    expect(sim.getState().status).toBe('已暂停');
    sim.stepFrame(C.frameDt);
    expect(sim.getState().params.detectorX).not.toBe(paused);
  });

  it('ignores NaN and non-positive steps while autoScan is on', () => {
    const sim = createSingleSlitSim({ detectorX: 1, autoScan: true });
    const frozen = sim.getState().params.detectorX;
    sim.step(Number.NaN);
    sim.step(-2);
    sim.step(0);
    expect(sim.getState().params.detectorX).toBe(frozen);
  });

  it('resets to construction defaults including scan direction', () => {
    const sim = createSingleSlitSim({
      lambda: 500,
      slitWidth: 0.4,
      distance: 1.2,
      detectorX: -10,
      autoScan: false
    });
    sim.stepFrame(2);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      lambda: 500,
      slitWidth: 0.4,
      distance: 1.2,
      detectorX: -10,
      autoScan: false
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getSnapshot()).toEqual(sim.getState());
  });

  it('clamps parameters and accepts URL-like 0/1 flags', () => {
    const sim = createSingleSlitSim({
      lambda: 12,
      slitWidth: 9,
      distance: 0,
      detectorX: 99,
      autoScan: 0 as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      lambda: C.lambdaMin,
      slitWidth: C.slitMax,
      distance: C.distanceMin,
      detectorX: C.detectorMax,
      autoScan: false
    });
    sim.setParams({
      lambda: 900,
      slitWidth: 0.01,
      distance: 8,
      detectorX: -80,
      autoScan: '1' as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      lambda: C.lambdaMax,
      slitWidth: C.slitMin,
      distance: C.distanceMax,
      detectorX: C.detectorMin,
      autoScan: true
    });
  });

  it('maps the screen, graph, and detector onto one x axis', () => {
    expect(xToPx(0)).toBe(C.centerX);
    expect(xToPx(C.detectorMax)).toBeCloseTo(C.graphRight, 8);
    expect(xToPx(C.detectorMin)).toBeCloseTo(C.graphLeft, 8);
    expect(pxToX(C.centerX)).toBeCloseTo(0, 8);
    expect(graphY(0)).toBe(C.graphBottom);
    expect(graphY(1)).toBe(C.graphTop);
    expect(graphTickLabel(1)).toBe('x₁');
    expect(graphTickLabel(-2)).toBe('x₋₂');
  });

  it('picks the detector on the screen or graph and stops autoScan', () => {
    expect(pickDetectorHandle(0.5, C.screenY / C.baseHeight)).toBe('detector');
    expect(pickDetectorHandle(0.5, C.graphTop / C.baseHeight)).toBe('detector');
    expect(pickDetectorHandle(0.5, 0.02)).toBeNull();
    const sim = createSingleSlitSim({ detectorX: 0, autoScan: true });
    sim.moveHandle('detector', 0.7, 0.4);
    expect(sim.getParams().autoScan).toBe(false);
    expect(sim.getParams().detectorX).toBeCloseTo(detectorXFromNorm(0.7), 8);
    expect(sim.getParams().detectorX).toBeGreaterThan(0);
  });
});

describe('single-slit entry readout', () => {
  it('reports θ, I/I₀, x₁, Δx and the three formulas', () => {
    const canvas = document.createElement('canvas');
    const scene = createSingleSlitScene({ canvas });
    scene.setParams({
      lambda: 670,
      slitWidth: 0.22,
      distance: 2.4,
      detectorX: 7.31,
      autoScan: false
    });
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.theta).toMatch(/°$/);
    expect(Number.parseFloat(items.intensity ?? '')).toBeLessThan(0.001);
    expect(items.firstMinimum).toBe('7.31 mm');
    expect(items.centralWidth).toBe('14.62 mm');
    expect(items.status).toBe('已暂停');
    expect(items.formulaI).toBe('I/I₀ = (sinβ/β)²');
    expect(items.formulaX1).toBe('x₁ ≈ λL/a');
    expect(items.formulaDx).toBe('Δx ≈ 2λL/a');
    scene.dispose();
  });
});

describe('single-slit stage transform', () => {
  it('uses an animation-only 960×660 frame', () => {
    expect(C.baseWidth).toBe(960);
    expect(C.baseHeight).toBe(660);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect(C.graphRight).toBeLessThan(C.baseWidth);
    expect(C.graphBottom).toBeLessThan(C.baseHeight - 40);
  });

  it('fits when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(960);
    expect(t.boxH).toBe(660);
    expect(t.fit).toBeCloseTo(Math.min(720 / 960, 500 / 660), 6);
    expect(t.offsetX).toBeCloseTo((720 - 960 * t.fit) / 2, 6);
  });

  it('treats mobile-stack as a non-floating readout', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-readout-overlay', 'false');
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
    const t = stageTransform(900, 640, {
      floatingReadout: true,
      overlayPx: 228
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.offsetX).toBe(0);
    expect(t.fit).toBeLessThanOrEqual(Math.min(900 / 960, 640 / 660) + 1e-9);
  });
});
