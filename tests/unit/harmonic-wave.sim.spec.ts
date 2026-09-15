import { describe, expect, it } from 'vitest';
import {
  createHarmonicWaveSim,
  ghostTime,
  harmonicWaveAcceleration,
  harmonicWaveConstants as C,
  harmonicWaveVelocity,
  harmonicWaveY,
  hasFloatingReadout,
  pointerToBaseNorm,
  pointerToWorldX,
  stageLayoutFrom,
  stageTransform,
  worldX
} from '../../src/scenes/harmonic-wave/scene.sim';

const TABLET_OVERLAY = {
  floatingReadout: true as const,
  overlayPx: 245,
  overlayTopPx: 60,
  overlayHeightPx: 374
};

const WAVE_LEFT = C.originX;
const WAVE_RIGHT = C.originX + C.waveWidth;
const WAVE_TOP = C.originY - C.amplitudeGuide;
const WAVE_BOTTOM = C.originY + C.amplitudeGuide;
const INDICATOR_TOP = C.indicatorCy - C.indicatorHeight / 2;
const P_AT_2 = worldX(2);

describe('harmonic-wave equation', () => {
  it('uses y = A sin[2π(t/T − x/λ)] with no extra π/2 phase', () => {
    // A=10, λ=4, T=2. t=0, x=0 → phase=0 → y=0, not a crest.
    expect(harmonicWaveY(0, 0, 10, 4, 2, 'right')).toBeCloseTo(0, 8);
    // x=λ/4=1 m → 2π(−1/4)=−π/2 → y=−A
    expect(harmonicWaveY(1, 0, 10, 4, 2, 'right')).toBeCloseTo(-10, 8);
    // x=λ/2=2 m → 2π(−1/2)=−π → y=0
    expect(harmonicWaveY(2, 0, 10, 4, 2, 'right')).toBeCloseTo(0, 8);
    // t=T/4=0.5 s, x=0 → 2π(1/4)=π/2 → y=+A
    expect(harmonicWaveY(0, 0.5, 10, 4, 2, 'right')).toBeCloseTo(10, 8);
  });

  it('flips only the spatial term for left-going waves', () => {
    // Left: y = A sin[2π(t/T + x/λ)]. t=0, x=1 → +π/2 → y=+A
    expect(harmonicWaveY(1, 0, 10, 4, 2, 'left')).toBeCloseTo(10, 8);
    expect(harmonicWaveY(0, 0, 10, 4, 2, 'left')).toBeCloseTo(0, 8);
    expect(harmonicWaveY(1, 0, 10, 4, 2, 'left')).toBeCloseTo(
      -harmonicWaveY(1, 0, 10, 4, 2, 'right'),
      8
    );
  });

  it('travels right for dir=+1 and left for dir=−1 at v=λ/T', () => {
    const [A, lambda, T] = [10, 4, 2];
    const v = 2;
    const dt = 0.3;
    const x = 3;
    const t = 0.4;
    expect(harmonicWaveY(x, t + dt, A, lambda, T, 'right')).toBeCloseTo(
      harmonicWaveY(x - v * dt, t, A, lambda, T, 'right'),
      10
    );
    expect(harmonicWaveY(x, t + dt, A, lambda, T, 'left')).toBeCloseTo(
      harmonicWaveY(x + v * dt, t, A, lambda, T, 'left'),
      10
    );
  });

  it('keeps v_y = (2πA/T) cos(phase) without a direction sign', () => {
    // t=0, x=0: phase=0, v_y = 2π·10/2 = 10π ≈ 31.4159, upward, same both ways
    const up = 31.415926535;
    expect(harmonicWaveVelocity(0, 0, 10, 4, 2, 'right')).toBeCloseTo(up, 6);
    expect(harmonicWaveVelocity(0, 0, 10, 4, 2, 'left')).toBeCloseTo(up, 6);
    expect(harmonicWaveVelocity(0, 0, 10, 4, 2, 'left')).toBeCloseTo(
      harmonicWaveVelocity(0, 0, 10, 4, 2, 'right'),
      8
    );
    // t=0, x=2: phase=−π (right) → cos(−π)=−1 → v_y=−10π, downward
    expect(harmonicWaveVelocity(2, 0, 10, 4, 2, 'right')).toBeCloseTo(-up, 6);
  });

  it('reports P displacement, velocity and acceleration directions both ways', () => {
    const right = createHarmonicWaveSim({
      amplitude: 10,
      wavelength: 4,
      period: 2,
      direction: 'right',
      pointX: 1
    });
    const r0 = right.getState();
    // t=0, x=1, right: y=−10 cm (below), v_y=0, a_y=−ω²y=+10π² upward
    expect(r0.pointY).toBeCloseTo(-10, 8);
    expect(r0.velocityDirection).toBe('zero');
    expect(r0.accelerationDirection).toBe('up');
    expect(r0.pointAcceleration).toBeCloseTo(98.69604401, 5);

    right.step(0.25);
    const r1 = right.getState();
    // t=T/8, phase=2π(0.125−0.25)=−π/4; y=−10/√2, v_y=10π/√2 > 0 (up)
    expect(r1.pointY).toBeCloseTo(-7.07106781, 5);
    expect(r1.velocityDirection).toBe('up');
    expect(r1.accelerationDirection).toBe('up');

    const left = createHarmonicWaveSim({
      amplitude: 10,
      wavelength: 4,
      period: 2,
      direction: 'left',
      pointX: 1
    });
    const l0 = left.getState();
    // t=0, x=1, left: y=+10 cm (above), v_y=0, a_y=−10π² downward
    expect(l0.pointY).toBeCloseTo(10, 8);
    expect(l0.velocityDirection).toBe('zero');
    expect(l0.accelerationDirection).toBe('down');
    expect(l0.pointAcceleration).toBeLessThan(0);

    const atP = createHarmonicWaveSim({ pointX: 2 });
    const p0 = atP.getState();
    expect(p0.pointY).toBeCloseTo(0, 8);
    expect(p0.velocityDirection).toBe('down');
    expect(p0.accelerationDirection).toBe('zero');
  });

  it('keeps a_y = −ω² y toward equilibrium', () => {
    expect(harmonicWaveAcceleration(5, 2)).toBeLessThan(0);
    expect(harmonicWaveAcceleration(-5, 2)).toBeGreaterThan(0);
    expect(harmonicWaveAcceleration(0, 2)).toBeCloseTo(0, 8);
    // ω=π, y=5 → a=−5π² ≈ −49.348
    expect(harmonicWaveAcceleration(5, 2)).toBeCloseTo(-49.348022005, 5);
  });

  it('shifts the ghost wave by 0.05 T, not a direction-scaled delay', () => {
    expect(ghostTime(1.2, 2)).toBeCloseTo(1.3, 8);
    const yNow = harmonicWaveY(3, 1.2, 10, 4, 2, 'right');
    const yGhost = harmonicWaveY(3, ghostTime(1.2, 2), 10, 4, 2, 'right');
    expect(yGhost).toBeCloseTo(harmonicWaveY(3, 1.3, 10, 4, 2, 'right'), 8);
    expect(Math.abs(yGhost - yNow)).toBeGreaterThan(0.2);
  });
});

describe('harmonic-wave sim controls', () => {
  it('keeps v = λ/T and clamps source ranges', () => {
    const sim = createHarmonicWaveSim({ wavelength: 6, period: 3 });
    expect(sim.getState().waveSpeed).toBeCloseTo(2, 8);
    sim.setParams({ amplitude: 99, wavelength: -1, period: 99 });
    expect(sim.getParams()).toMatchObject({
      amplitude: 10,
      wavelength: 2,
      period: 4
    });
  });

  it('parses 0/1 URL flags and direction strings', () => {
    const sim = createHarmonicWaveSim({
      showGhost: 1 as unknown as boolean,
      showVelocity: 0 as unknown as boolean,
      showAcceleration: 'false' as unknown as boolean,
      direction: 'left'
    });
    expect(sim.getParams()).toMatchObject({
      showGhost: true,
      showVelocity: false,
      showAcceleration: false,
      direction: 'left'
    });
    sim.setParams({
      showGhost: 0 as unknown as boolean,
      direction: 'right'
    });
    expect(sim.getParams().showGhost).toBe(false);
    expect(sim.getParams().direction).toBe('right');
  });

  it('moves P, advances time and resets', () => {
    const sim = createHarmonicWaveSim();
    expect(sim.getParams().showGhost).toBe(false);
    sim.setPointX(99);
    expect(sim.getParams().pointX).toBe(8);
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().pointX).toBe(2);
    expect(sim.getParams().showGhost).toBe(false);
  });
});

describe('harmonic-wave stage transform', () => {
  it('fits canvases to 960×430 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(960);
    expect(t.boxH).toBe(430);
    expect(t.fit).toBeCloseTo(Math.min(720 / 960, 500 / 430), 6);
    expect(t.offsetX).toBeCloseTo((720 - 960 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 430 * t.fit) / 2, 6);
    expect(t.offsetX + 960 * t.fit).toBeLessThanOrEqual(720 + 1e-6);
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

  it('fits desktop canvases so a floating overlay does not cover the 960 stage', () => {
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.offsetX).toBe(0);
    expect(960 * t.fit).toBeLessThanOrEqual(971 - 212 - 16 + 1e-6);
  });

  it('keeps 1440 split-right in the left overlay gutter with the wave clear', () => {
    const cssW = 971;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const overlayLeft = cssW - TABLET_OVERLAY.overlayPx;
    expect(t.offsetX).toBe(0);
    expect(960 * t.fit).toBeLessThanOrEqual(
      cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
    expect(t.fit).toBeCloseTo(
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / 960,
      5
    );
    expect(t.offsetX + WAVE_RIGHT * t.fit).toBeLessThanOrEqual(
      overlayLeft - C.overlayGapPx + 1e-6
    );
    expect(t.offsetX + WAVE_LEFT * t.fit).toBeGreaterThanOrEqual(0);
    expect(t.offsetX + 960 * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
    expect(t.offsetY + WAVE_TOP * t.fit).toBeGreaterThanOrEqual(0);
    expect(t.offsetY + WAVE_BOTTOM * t.fit).toBeLessThanOrEqual(cssH + 1e-6);
  });

  it('does not crush 768 split-right into the left-of-overlay gutter', () => {
    const cssW = 520;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit =
      (cssW - TABLET_OVERLAY.overlayPx - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.15);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + WAVE_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + INDICATOR_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 16
    );
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
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetY + WAVE_TOP * t.fit).toBeGreaterThanOrEqual(
      TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx - 1e-6
    );
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('keeps 1024×768 wave and P clear of the floating overlay', () => {
    const cssW = 688;
    const cssH = 600;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const overlay = {
      left: cssW - TABLET_OVERLAY.overlayPx,
      top: TABLET_OVERLAY.overlayTopPx,
      right: cssW,
      bottom: TABLET_OVERLAY.overlayTopPx + TABLET_OVERLAY.overlayHeightPx
    };
    const wave = {
      left: t.offsetX + WAVE_LEFT * t.fit,
      top: t.offsetY + WAVE_TOP * t.fit,
      right: t.offsetX + WAVE_RIGHT * t.fit,
      bottom: t.offsetY + WAVE_BOTTOM * t.fit
    };
    const hits =
      wave.left < overlay.right - 1 &&
      wave.right > overlay.left + 1 &&
      wave.top < overlay.bottom - 1 &&
      wave.bottom > overlay.top + 1;
    expect(hits).toBe(false);
    expect(t.fit).toBeGreaterThanOrEqual(C.minReadableFit);
    expect(t.offsetY + WAVE_BOTTOM * t.fit).toBeLessThanOrEqual(cssH + 1e-6);
    expect(t.offsetX + WAVE_RIGHT * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('inverts the stage transform so P at x=2 stays on the 960 map', () => {
    const cases = [
      { cssW: 971, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 520, cssH: 831, layout: TABLET_OVERLAY },
      { cssW: 720, cssH: 500, layout: { floatingReadout: false } }
    ];
    for (const { cssW, cssH, layout } of cases) {
      const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
      const pCssX = offsetX + P_AT_2 * fit;
      const pCssY = offsetY + C.originY * fit;
      const n = pointerToBaseNorm(pCssX, pCssY, cssW, cssH, layout);
      expect(n.x * 960).toBeCloseTo(P_AT_2, 6);
      expect(n.y * 430).toBeCloseTo(C.originY, 6);
      expect(pointerToWorldX(pCssX, pCssY, cssW, cssH, layout)).toBeCloseTo(
        2,
        6
      );
    }
    const desktop = { cssW: 971, cssH: 831, layout: TABLET_OVERLAY };
    const t = stageTransform(desktop.cssW, desktop.cssH, desktop.layout);
    const pCssX = t.offsetX + P_AT_2 * t.fit;
    const naiveX = (pCssX / desktop.cssW) * 960;
    expect(Math.abs(naiveX - P_AT_2)).toBeGreaterThan(20);
  });
});
