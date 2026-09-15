import { describe, expect, it } from 'vitest';
import {
  createFaradaySim,
  faradayConstants as C,
  faradayCurrent,
  faradayEmf,
  faradayMatchingPreset,
  faradayPolarity,
  faradayRimPositive,
  flag,
  hasFloatingReadout,
  pointerToBaseNorm,
  stageLayoutFrom,
  stageTransform
} from '../../src/scenes/faraday-disc/scene.sim';

const TABLET_OVERLAY = {
  floatingReadout: true as const,
  overlayPx: 245,
  overlayTopPx: 60,
  overlayHeightPx: 374
};

const DISC_RIGHT = C.discCenter.x + C.discRadius;
const DISC_TOP = C.discCenter.y - C.discRadius;
const CIRCUIT_RIGHT = C.circuitX + C.circuitW / 2;

describe('faraday-disc physics', () => {
  it('uses E = ½BωR² with independently computed values', () => {
    // ½ × 1 × 10 × 0.2² = 0.5 × 10 × 0.04 = 0.2 V
    expect(faradayEmf(1, 10, 0.2)).toBeCloseTo(0.2, 10);
    // ½ × 2 × 8 × 0.25² = 8 × 0.0625 = 0.5 V
    expect(faradayEmf(2, 8, 0.25)).toBeCloseTo(0.5, 10);
    // ½ × 1 × 10 × 0.4² = 5 × 0.16 = 0.8 V
    expect(faradayEmf(1, 10, 0.4)).toBeCloseTo(0.8, 10);
  });

  it('gives closed-circuit I = E/R外 and open-circuit I = 0', () => {
    // E = 0.2 V, R外 = 2 Ω → I = 0.10 A；r内 = 0
    expect(faradayCurrent(0.2, true, 2)).toBeCloseTo(0.1, 10);
    expect(faradayCurrent(0.2, false, 2)).toBe(0);
    expect(faradayCurrent(0.5, true, 1)).toBeCloseTo(0.5, 10);
  });

  it('matches cover defaults E=0.20 V, I=0.10 A, P=0.020 W, M=0.0020 N·m', () => {
    const sim = createFaradaySim({
      B: 1,
      omega: 10,
      radius: 0.2,
      externalResistance: 2,
      closed: true
    });
    const s = sim.getState();
    expect(s.emf).toBeCloseTo(0.2, 8);
    expect(s.current).toBeCloseTo(0.1, 8);
    // P电 = I E = 0.1 × 0.2 = 0.02 W
    expect(s.power).toBeCloseTo(0.02, 8);
    // M安 = P / ω = 0.02 / 10 = 0.002 N·m
    expect(s.torque).toBeCloseTo(0.002, 8);
    expect(s.bulbOn).toBe(true);
  });

  it('turns the bulb off and zeros I, P, M when the loop is open', () => {
    const sim = createFaradaySim({
      B: 2,
      omega: 8,
      radius: 0.25,
      externalResistance: 1,
      closed: true
    });
    expect(sim.getState().emf).toBeCloseTo(0.5, 8);
    sim.setParams({ closed: false });
    const open = sim.getState();
    expect(open.emf).toBeCloseTo(0.5, 8);
    expect(open.current).toBe(0);
    expect(open.power).toBe(0);
    expect(open.torque).toBe(0);
    expect(open.bulbOn).toBe(false);
    expect(open.currentSign).toBe(0);
  });

  it('sets rim polarity from v × B, not from B alone', () => {
    // 盘顶 P：顺时针 v 向右。B 向里 → F 沿半径向外 → 边缘为正。
    expect(faradayRimPositive('cw', 'into')).toBe(true);
    expect(faradayPolarity('cw', 'into')).toBe('A−/B+');
    expect(faradayRimPositive('cw', 'out')).toBe(false);
    expect(faradayPolarity('cw', 'out')).toBe('A+/B−');
    expect(faradayRimPositive('ccw', 'into')).toBe(false);
    expect(faradayPolarity('ccw', 'into')).toBe('A+/B−');
    expect(faradayRimPositive('ccw', 'out')).toBe(true);
    expect(faradayPolarity('ccw', 'out')).toBe('A−/B+');
  });

  it('keeps P-point vector directions consistent with polarity', () => {
    const cwInto = createFaradaySim({
      rotation: 'cw',
      field: 'into'
    }).getState();
    expect(cwInto.velocityRight).toBe(true);
    expect(cwInto.forceOutward).toBe(true);
    expect(cwInto.rimPositive).toBe(true);

    const ccwInto = createFaradaySim({
      rotation: 'ccw',
      field: 'into'
    }).getState();
    expect(ccwInto.velocityRight).toBe(false);
    expect(ccwInto.forceOutward).toBe(false);
    expect(ccwInto.rimPositive).toBe(false);
  });

  it('accepts URL-style 0/1/true/false for the closed flag', () => {
    expect(flag(0, true)).toBe(false);
    expect(flag('0', true)).toBe(false);
    expect(flag('false', true)).toBe(false);
    expect(flag(1, false)).toBe(true);
    expect(flag('1', false)).toBe(true);
    expect(flag('true', false)).toBe(true);
    const sim = createFaradaySim({ closed: 0 });
    expect(sim.getParams().closed).toBe(false);
    sim.setParams({ closed: 1 });
    expect(sim.getParams().closed).toBe(true);
    sim.setParams({ closed: 'false' });
    expect(sim.getParams().closed).toBe(false);
  });

  it('applies teaching presets without resetting B, ω, R', () => {
    const sim = createFaradaySim({ B: 1.6, omega: 14, radius: 0.3 });
    sim.applyPreset('open-circuit');
    expect(sim.getParams()).toMatchObject({
      B: 1.6,
      omega: 14,
      radius: 0.3,
      rotation: 'cw',
      field: 'into',
      closed: false
    });
    expect(faradayMatchingPreset(sim.getParams())).toBe('open-circuit');
    sim.applyPreset('reverse-field');
    expect(sim.getParams()).toMatchObject({
      field: 'out',
      closed: true,
      rotation: 'cw'
    });
    expect(faradayMatchingPreset(sim.getParams())).toBe('reverse-field');
  });

  it('clamps parameters and integrates angle so pause does not jump', () => {
    const sim = createFaradaySim();
    sim.setParams({ B: 99, omega: -1, radius: 2, externalResistance: -1 });
    expect(sim.getParams()).toMatchObject({
      B: 2,
      omega: 2,
      radius: 0.4,
      externalResistance: 0.5
    });
    sim.reset();
    sim.setParams({ omega: 10, rotation: 'cw' });
    sim.step(0.5);
    const after = sim.getState();
    expect(after.time).toBeCloseTo(0.5, 8);
    expect(after.angle).toBeCloseTo(5, 8);
    const frozen = after.angle;
    sim.setParams({ omega: 20 });
    expect(sim.getState().angle).toBeCloseTo(frozen, 8);
    sim.setParams({ rotation: 'ccw' });
    sim.step(0.2);
    expect(sim.getState().angle).toBeCloseTo(frozen - 4, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().angle).toBe(0);
    expect(sim.getParams().omega).toBe(10);
  });
});

describe('faraday-disc stage transform', () => {
  it('fits canvases to 880×640 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(880);
    expect(t.boxH).toBe(640);
    expect(t.fit).toBeCloseTo(Math.min(720 / 880, 500 / 640), 6);
    expect(t.offsetX).toBeCloseTo((720 - 880 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 640 * t.fit) / 2, 6);
    expect(t.offsetX + 880 * t.fit).toBeLessThanOrEqual(720 + 1e-6);
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

  it('treats split-right as a floating readout', () => {
    const root = document.createElement('div');
    root.className = 'split-right-shell';
    root.setAttribute('data-testid', 'split-right-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(true);
    expect(stageLayoutFrom(canvas).floatingReadout).toBe(true);
    expect(stageLayoutFrom(canvas).overlayPx).toBe(C.overlayFallbackPx);
    root.remove();
  });

  it('keeps 1440 split-right in the left overlay gutter with disc and circuit clear', () => {
    const cssW = 971;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const overlayLeft = cssW - TABLET_OVERLAY.overlayPx;
    expect(t.offsetX).toBe(0);
    expect(C.baseWidth * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + DISC_RIGHT * t.fit).toBeLessThanOrEqual(
      overlayLeft - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + CIRCUIT_RIGHT * t.fit).toBeLessThanOrEqual(
      overlayLeft + 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('keeps 1024 split-right below the floating overlay when the gutter is narrow', () => {
    const cssW = 688;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    expect(t.offsetX).toBeGreaterThanOrEqual(0);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + DISC_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('does not crush 768 split-right into the left-of-overlay gutter', () => {
    const cssW = 520;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit =
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.1);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + DISC_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('does not crush 900 split-right into the left-of-overlay gutter', () => {
    const cssW = 612;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit =
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.04);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(t.offsetY + DISC_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('inverts the stage transform so disc center stays on the 880×640 map', () => {
    const cases = [
      { cssW: 971, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 520, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 720, cssH: 500, layout: { floatingReadout: false } }
    ];
    for (const { cssW, cssH, layout } of cases) {
      const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
      const cx = offsetX + C.discCenter.x * fit;
      const cy = offsetY + C.discCenter.y * fit;
      const n = pointerToBaseNorm(cx, cy, cssW, cssH, layout);
      expect(n.x * 880).toBeCloseTo(C.discCenter.x, 6);
      expect(n.y * 640).toBeCloseTo(C.discCenter.y, 6);
    }
  });
});
