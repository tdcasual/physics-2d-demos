import { describe, expect, it } from 'vitest';
import {
  buildCyclotronPath,
  createCyclotronSim,
  cyclotronConstants as C,
  cyclotronCrossingLimit,
  cyclotronMaxEnergy,
  cyclotronOmega,
  cyclotronPeriodRatio,
  cyclotronRadius,
  deriveCyclotronState,
  hasFloatingReadout,
  PARTICLES,
  pointerToBaseNorm,
  stageLayoutFrom,
  stageTransform
} from '../../src/scenes/cyclotron/scene.sim';

const TABLET_OVERLAY = {
  floatingReadout: true as const,
  overlayPx: 245,
  overlayTopPx: 60,
  overlayHeightPx: 374
};

const DEE_RIGHT = C.centerX + C.deeRadius;
const DEE_TOP = C.centerY - C.deeRadius - C.gapHalf;
const SOURCE_LEFT = C.centerX + C.sourceOffsetX - C.sourceRadius;

function halfPeriod(
  particle: 'proton' | 'deuteron' | 'alpha',
  B: number
): number {
  return Math.PI / cyclotronOmega(particle, B);
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('cyclotron sim', () => {
  it('matches the source maximum-energy scaling Eₖₘ ∝ q²B²/m', () => {
    // Teaching scale: Eₖₘ = 40 q²B²/m MeV. Proton q=1 m=1 B=3 → 40×9 = 360.
    expect(cyclotronMaxEnergy('proton', 3)).toBe(360);
    expect(cyclotronMaxEnergy('deuteron', 3)).toBe(180);
    expect(cyclotronMaxEnergy('alpha', 3)).toBe(360);
    expect(cyclotronMaxEnergy('proton', 1)).toBe(40);
    expect(cyclotronMaxEnergy('alpha', 1)).toBe(40);
  });

  it('keeps T/T₀ = m/(qB) independent of voltage', () => {
    // Proton m/q=1, B=3 → 1/3. Deuteron m/q=2 → 2/3. Alpha m/q=2 → 2/3.
    expect(cyclotronPeriodRatio('proton', 3)).toBeCloseTo(1 / 3, 8);
    expect(cyclotronPeriodRatio('deuteron', 3)).toBeCloseTo(2 / 3, 8);
    expect(cyclotronPeriodRatio('alpha', 3)).toBeCloseTo(2 / 3, 8);
    const sim = createCyclotronSim({ U: 10 });
    const before = sim.getState().periodRatio;
    sim.setParams({ U: 50 });
    expect(sim.getState().periodRatio).toBe(before);
  });

  it('gains qU per gap crossing and clamps at Eₖₘ', () => {
    const sim = createCyclotronSim({ particle: 'proton', B: 3, U: 30 });
    const dt = halfPeriod('proton', 3);
    sim.step(dt + 1e-6);
    expect(sim.getState().crossings).toBe(1);
    expect(sim.getState().energy).toBe(30);
    sim.step(dt);
    expect(sim.getState().crossings).toBe(2);
    expect(sim.getState().energy).toBe(60);
    sim.step(20);
    const state = sim.getState();
    expect(state.energy).toBe(state.maxEnergy);
    expect(state.radius).toBeCloseTo(C.visualRadius, 8);
    expect(state.extracted).toBe(true);
    expect(state.exitSide).toBe('right');
    expect(state.status).toBe('可引出');
  });

  it('uses α-particle charge 2 so each crossing adds 2U', () => {
    const sim = createCyclotronSim({ particle: 'alpha', B: 3, U: 30 });
    sim.step(halfPeriod('alpha', 3) + 1e-6);
    expect(sim.getState().crossings).toBe(1);
    expect(sim.getState().energy).toBe(60);
    expect(sim.getState().maxEnergy).toBe(360);
  });

  it('builds a continuous alternating left/right semicircle path', () => {
    const path = buildCyclotronPath('proton', 3, 30);
    expect(path.nMax).toBe(12);
    expect(path.visualRadius).toBeCloseTo(C.visualRadius, 8);
    // Source HTML walk, proton B=3 U=30: injection is shifted to +42.7 px.
    expect(path.startX).toBeCloseTo(42.705, 2);
    let cursor = path.startX;
    for (let i = 1; i <= path.nMax; i += 1) {
      const radius = path.radii[i];
      const expected = i % 2 === 1 ? cursor - radius : cursor + radius;
      expect(path.centers[i]).toBeCloseTo(expected, 8);
      cursor =
        i % 2 === 1 ? path.centers[i] - radius : path.centers[i] + radius;
    }
    const state = deriveCyclotronState(
      { particle: 'proton', B: 3, U: 30, autoRun: true, showField: true },
      0
    );
    expect(state.position.y).toBeCloseTo(C.centerY, 8);
    expect(state.position.x).toBeCloseTo(state.startX, 8);
    expect(state.orbits[0].side).toBe('top');
    expect(state.orbits[1].side).toBe('bottom');
    for (let i = 0; i < state.orbits.length - 1; i += 1) {
      expect(state.orbits[i].endX).toBeCloseTo(state.orbits[i + 1].startX, 8);
    }
  });

  it('keeps particle, trail endpoints and extraction on one continuous path', () => {
    const params = {
      particle: 'proton' as const,
      B: 3,
      U: 30,
      autoRun: true,
      showField: true
    };
    const dt = halfPeriod('proton', 3);
    let previous = deriveCyclotronState(params, 0).position;
    const step = dt / 16;
    let maxJump = 0;
    for (let i = 1; i <= 16 * 14; i += 1) {
      const next = deriveCyclotronState(params, i * step).position;
      maxJump = Math.max(maxJump, distance(previous, next));
      previous = next;
    }
    expect(maxJump).toBeLessThan(50);
    const beforeCross = deriveCyclotronState(params, dt - 1e-4);
    const afterCross = deriveCyclotronState(params, dt + 1e-4);
    expect(distance(beforeCross.position, afterCross.position)).toBeLessThan(1);
    expect(beforeCross.position.y).toBeLessThan(C.centerY);
    expect(afterCross.position.y).toBeGreaterThan(C.centerY);
  });

  it('grows orbit radius as √(orbit index / N) and never exceeds the D', () => {
    const path = buildCyclotronPath('proton', 3, 30);
    for (let i = 1; i <= path.nMax; i += 1) {
      expect(path.radii[i]).toBeCloseTo(
        path.visualRadius * Math.sqrt(i / path.nMax),
        8
      );
      expect(path.radii[i]).toBeLessThanOrEqual(C.deeRadius);
    }
    const mid = deriveCyclotronState(
      { particle: 'proton', B: 3, U: 30, autoRun: true, showField: true },
      6 * halfPeriod('proton', 3)
    );
    expect(mid.crossings).toBe(6);
    expect(mid.energy).toBe(180);
    expect(mid.radius).toBeCloseTo(path.radii[7], 8);
    expect(cyclotronRadius(180, 360)).toBeCloseTo(
      C.visualRadius / Math.sqrt(2),
      8
    );
    expect(cyclotronRadius(0, 360)).toBe(0);
  });

  it('flips gap polarity each half-turn so a positive ion is always pulled forward', () => {
    const params = {
      particle: 'proton' as const,
      B: 3,
      U: 30,
      autoRun: true,
      showField: true
    };
    const dt = halfPeriod('proton', 3);
    const first = deriveCyclotronState(params, dt * 0.5);
    expect(first.fieldUp).toBe(true);
    expect(first.topPositive).toBe(false);
    expect(first.position.y).toBeLessThan(C.centerY);
    const second = deriveCyclotronState(params, dt * 1.5);
    expect(second.fieldUp).toBe(false);
    expect(second.topPositive).toBe(true);
    expect(second.position.y).toBeGreaterThan(C.centerY);
  });

  it('extracts left for odd N and right for even N', () => {
    const even = deriveCyclotronState(
      { particle: 'proton', B: 3, U: 30, autoRun: true, showField: true },
      20
    );
    expect(even.nMax % 2).toBe(0);
    expect(even.extracted).toBe(true);
    expect(even.exitSide).toBe('right');
    expect(even.position.x).toBeGreaterThan(C.centerX);
    expect(even.position.y).toBeLessThan(C.centerY);

    const odd = deriveCyclotronState(
      { particle: 'alpha', B: 1, U: 50, autoRun: true, showField: true },
      20
    );
    expect(odd.nMax).toBe(1);
    expect(odd.extracted).toBe(true);
    expect(odd.exitSide).toBe('left');
    expect(odd.energy).toBe(odd.maxEnergy);
    expect(odd.position.x).toBeLessThan(C.centerX);
    expect(odd.position.y).toBeGreaterThan(C.centerY);
  });

  it('resets the orbit when B, U or particle change and pauses when autoRun is off', () => {
    const sim = createCyclotronSim();
    sim.step(halfPeriod('proton', 3));
    expect(sim.getState().crossings).toBeGreaterThan(0);
    sim.setParams({ U: 50 });
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().crossings).toBe(0);
    sim.step(halfPeriod('proton', 3));
    sim.setParticle('deuteron');
    expect(sim.getState().params.particle).toBe('deuteron');
    expect(sim.getState().t).toBe(0);
    sim.setParams({ B: 99, U: -1, particle: 'helium' as never });
    expect(sim.getParams()).toMatchObject({ B: 3, U: 10, particle: 'proton' });
    sim.setParams({ autoRun: false });
    const frozen = sim.getState().t;
    sim.step(4);
    expect(sim.getState().t).toBe(frozen);
    sim.setParams({ autoRun: 0 as never });
    expect(sim.getParams().autoRun).toBe(false);
    sim.setParams({ autoRun: '1' as never, showField: '0' as never });
    expect(sim.getParams()).toMatchObject({ autoRun: true, showField: false });
    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(sim.getParams().particle).toBe('proton');
  });

  it('keeps N_max = floor(Eₖₘ / qU) at least 1 and independent of the visual walk', () => {
    expect(cyclotronCrossingLimit('proton', 3, 30)).toBe(12);
    expect(cyclotronCrossingLimit('proton', 3, 10)).toBe(36);
    expect(cyclotronCrossingLimit('deuteron', 3, 30)).toBe(6);
    expect(cyclotronCrossingLimit('alpha', 3, 30)).toBe(6);
    expect(cyclotronCrossingLimit('alpha', 1, 50)).toBe(1);
    const q = PARTICLES.proton.charge;
    expect(12 * q * 30).toBe(cyclotronMaxEnergy('proton', 3));
  });
});

describe('cyclotron stage transform', () => {
  it('fits canvases to 640×660 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(640);
    expect(t.boxH).toBe(660);
    expect(t.fit).toBeCloseTo(Math.min(720 / 640, 500 / 660), 6);
    expect(t.offsetX).toBeCloseTo((720 - 640 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 660 * t.fit) / 2, 6);
    expect(t.offsetX + 640 * t.fit).toBeLessThanOrEqual(720 + 1e-6);
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

  it('treats split-right as a floating readout', () => {
    const root = document.createElement('div');
    root.className = 'split-right-shell';
    root.setAttribute('data-readout-overlay', 'true');
    root.setAttribute('data-testid', 'split-right-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(true);
    expect(stageLayoutFrom(canvas).floatingReadout).toBe(true);
    expect(stageLayoutFrom(canvas).overlayPx).toBe(C.overlayFallbackPx);
    root.remove();
  });

  it('fits desktop canvases so a floating overlay does not cover the 640 stage', () => {
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(971 - 212 - 16 + 1e-6);
  });

  it('keeps 1440 split-right in the left overlay gutter with D, source and trail clear', () => {
    const cssW = 971;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const overlayLeft = cssW - TABLET_OVERLAY.overlayPx;
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.fit).toBeCloseTo(
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / 640,
      5
    );
    expect(t.offsetX + DEE_RIGHT * t.fit).toBeLessThanOrEqual(
      overlayLeft - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + SOURCE_LEFT * t.fit).toBeGreaterThanOrEqual(0);
    expect(t.offsetX + 640 * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('keeps 1024 split-right in the left overlay gutter', () => {
    const cssW = 688;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.fit).toBeCloseTo(
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / 640,
      5
    );
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
  });

  it('keeps 1024×900 measured canvas in the left overlay gutter', () => {
    const cssW = 667;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + DEE_RIGHT * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
  });

  it('keeps 1024×768 split-right in the left overlay gutter', () => {
    const cssW = 688;
    const cssH = 600;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + DEE_RIGHT * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + 640 * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('does not crush 768 split-right into the left-of-overlay gutter', () => {
    const cssW = 520;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit =
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.15);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(C.baseWidth * t.fit).toBeGreaterThan(350);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + DEE_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX).toBeGreaterThan(0);
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('does not crush 900 split-right into the left-of-overlay gutter', () => {
    const cssW = 612;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit =
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.05);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(C.baseWidth * t.fit).toBeGreaterThan(380);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + DEE_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('inverts the stage transform so source and D stay on the 640×660 map', () => {
    const cases = [
      { cssW: 971, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 520, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 720, cssH: 500, layout: { floatingReadout: false } }
    ];
    for (const { cssW, cssH, layout } of cases) {
      const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
      const sourceCssX = offsetX + (C.centerX + C.sourceOffsetX) * fit;
      const sourceCssY = offsetY + C.centerY * fit;
      const n = pointerToBaseNorm(sourceCssX, sourceCssY, cssW, cssH, layout);
      expect(n.x * 640).toBeCloseTo(C.centerX + C.sourceOffsetX, 6);
      expect(n.y * 660).toBeCloseTo(C.centerY, 6);
      const deeCssX = offsetX + DEE_RIGHT * fit;
      const dee = pointerToBaseNorm(deeCssX, sourceCssY, cssW, cssH, layout);
      expect(dee.x * 640).toBeCloseTo(DEE_RIGHT, 6);
    }
  });
});
