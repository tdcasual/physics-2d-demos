import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createMagneticMirrorSim,
  isMirrorTrapped,
  magneticFieldRatio,
  magneticMirrorConstants,
  mirrorPointFor
} from '../../src/scenes/magnetic-mirror/scene.sim';
import { createMagneticMirrorView } from '../../src/scenes/magnetic-mirror/scene.view';

describe('magnetic mirror simulation', () => {
  it('uses a weak center and stronger mirror ends', () => {
    expect(magneticFieldRatio(0, 6)).toBe(1);
    expect(magneticFieldRatio(1, 6)).toBe(6);
    expect(magneticFieldRatio(-1, 6)).toBe(6);
    // B/B0 = 1+(Rm-1)|x|^4 → |x|=1/2, Rm=6 → 1+5/16 = 1.3125
    expect(magneticFieldRatio(0.5, 6)).toBeCloseTo(1.3125, 10);
  });

  it('computes a finite reflection point for a trapped particle', () => {
    const point = mirrorPointFor(35, 6);
    expect(point).toBeGreaterThan(0);
    expect(point).toBeLessThan(1);
  });

  it('conserves kinetic energy while exchanging parallel and perpendicular speed', () => {
    const sim = createMagneticMirrorSim({ pitchAngle: 35, mirrorRatio: 6 });
    const start = sim.getState();
    let later = start;
    for (let i = 0; i < 80; i += 1) {
      sim.step(0.016);
      later = sim.getState();
      if (Math.abs(later.position) > 0.25) break;
    }
    expect(Math.abs(later.position)).toBeGreaterThan(0.25);
    expect(later.energy).toBeCloseTo(start.energy, 8);
    expect(later.perpendicularSpeed).toBeGreaterThan(start.perpendicularSpeed);
    expect(Math.abs(later.parallelSpeed)).toBeLessThan(
      Math.abs(start.parallelSpeed)
    );
  });

  it('pauses and clamps parameters safely', () => {
    const sim = createMagneticMirrorSim({
      pitchAngle: 999,
      mirrorRatio: 99,
      autoRun: false
    });
    const before = sim.getState();
    expect(sim.getParams().pitchAngle).toBe(85);
    expect(sim.getParams().mirrorRatio).toBe(10);
    sim.step(1);
    expect(sim.getState().position).toBe(before.position);
  });

  it('conserves energy and magnetic moment while B rises', () => {
    const sim = createMagneticMirrorSim({ pitchAngle: 45, mirrorRatio: 4 });
    const start = sim.getState();
    // μ = mv⊥²/(2B); at x=0, B=B0, μ = Ek sin²θ
    expect(start.energy).toBeCloseTo(
      0.5 * magneticMirrorConstants.particleSpeed ** 2,
      10
    );
    expect(start.magneticMoment).toBeCloseTo(start.energy * 0.5, 8);

    for (let i = 0; i < 240; i += 1) {
      sim.step(0.016);
      const later = sim.getState();
      expect(later.energy).toBeCloseTo(start.energy, 8);
      expect(later.magneticMoment).toBeCloseTo(start.magneticMoment, 8);
    }
    const highField = createMagneticMirrorSim({
      pitchAngle: 45,
      mirrorRatio: 4
    });
    const centerRadius = highField.getState().gyroRadius;
    let stronger = highField.getState();
    for (let i = 0; i < 80; i += 1) {
      highField.step(0.016);
      stronger = highField.getState();
      if (stronger.fieldRatio > 1.2) break;
    }
    expect(stronger.fieldRatio).toBeGreaterThan(1.2);
    expect(stronger.gyroRadius).toBeLessThan(centerRadius);
  });

  it('reflects at the mirror point and lets the loss cone pass through', () => {
    // θ=45°, Rm=4: sin²θ·Rm = 0.5×4 = 2 > 1 → trapped
    // B/B0 = 1/sin²θ = 2 = 1+(4-1)|x|^4 → |x|^4 = 1/3
    expect(isMirrorTrapped(45, 4)).toBe(true);
    const mirrorPoint = mirrorPointFor(45, 4);
    expect(mirrorPoint ** 4).toBeCloseTo(1 / 3, 10);

    const trapped = createMagneticMirrorSim({
      pitchAngle: 45,
      mirrorRatio: 4
    });
    let maxAbs = 0;
    let flips = 0;
    let lastSign = 1;
    for (let i = 0; i < 500; i += 1) {
      trapped.step(0.016);
      const state = trapped.getState();
      maxAbs = Math.max(maxAbs, Math.abs(state.position));
      expect(Math.abs(state.position)).toBeLessThanOrEqual(mirrorPoint + 1e-9);
      const sign = Math.sign(state.parallelSpeed);
      if (sign !== 0 && sign !== lastSign) {
        flips += 1;
        expect(Math.abs(state.position)).toBeGreaterThan(mirrorPoint - 0.05);
        lastSign = sign;
      }
    }
    expect(maxAbs).toBeCloseTo(mirrorPoint, 2);
    expect(flips).toBeGreaterThan(0);

    // θ=30°, Rm=4: sin²θ·Rm = 0.25×4 = 1 → loss cone, no reflection
    expect(isMirrorTrapped(30, 4)).toBe(false);
    expect(mirrorPointFor(30, 4)).toBe(1);
    const escaping = createMagneticMirrorSim({
      pitchAngle: 30,
      mirrorRatio: 4
    });
    const signs = new Set<number>();
    let reachedEnd = false;
    for (let i = 0; i < 250; i += 1) {
      escaping.step(0.016);
      const state = escaping.getState();
      const sign = Math.sign(state.parallelSpeed);
      if (sign !== 0) signs.add(sign);
      if (Math.abs(state.position) > 0.95) reachedEnd = true;
      expect(state.status).not.toBe('磁镜反射');
    }
    expect(reachedEnd).toBe(true);
    expect([...signs]).toEqual([1]);
  });

  it('scales pitch as d = v∥·2πm/(qB), not a constant gyro period', () => {
    const sim = createMagneticMirrorSim({ pitchAngle: 35, mirrorRatio: 6 });
    const start = sim.getState();
    const startInvariant =
      (start.pitchDistance * start.fieldRatio) / Math.abs(start.parallelSpeed);
    let later = start;
    for (let i = 0; i < 80; i += 1) {
      sim.step(0.016);
      later = sim.getState();
      if (later.fieldRatio > 1.2) break;
    }
    expect(later.fieldRatio).toBeGreaterThan(1.2);
    expect(later.pitchDistance).toBeLessThan(start.pitchDistance);
    const laterInvariant =
      (later.pitchDistance * later.fieldRatio) / Math.abs(later.parallelSpeed);
    expect(laterInvariant).toBeCloseTo(startInvariant, 8);
  });

  it('stays finite at the mirror wall and does not jitter when paused', () => {
    const sim = createMagneticMirrorSim({ pitchAngle: 45, mirrorRatio: 4 });
    const mirrorPoint = mirrorPointFor(45, 4);
    let guard = 0;
    while (sim.getState().position < mirrorPoint - 1e-6 && guard < 4000) {
      sim.step(0.016);
      guard += 1;
    }
    expect(sim.getState().position).toBeCloseTo(mirrorPoint, 6);
    expect(sim.getState().parallelSpeed).toBeLessThanOrEqual(0);

    for (let i = 0; i < 40; i += 1) sim.step(0.001);
    const afterHold = sim.getState();
    expect(afterHold.parallelSpeed).toBeLessThanOrEqual(0);
    expect(afterHold.position).toBeLessThanOrEqual(mirrorPoint + 1e-9);
    expect(Number.isFinite(afterHold.energy)).toBe(true);
    expect(Number.isFinite(afterHold.magneticMoment)).toBe(true);
    expect(Number.isFinite(afterHold.pitchDistance)).toBe(true);

    sim.setParams({ autoRun: false });
    const frozen = sim.getState();
    sim.step(1);
    const paused = sim.getState();
    expect(paused.position).toBe(frozen.position);
    expect(paused.time).toBe(frozen.time);
    expect(paused.status).toBe('已暂停');
    expect(Math.abs(paused.position)).toBeLessThanOrEqual(1);
  });
});

describe('magnetic mirror view', () => {
  it('does not draw formula/readout panel cards on the canvas', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/magnetic-mirror/scene.view.ts'),
      'utf8'
    );
    expect(source).not.toContain('function drawPanel');
    expect(source).not.toMatch(/\bdrawPanel\s*\(/);
    expect(source).not.toContain('FORMULA_CARD');
    expect(source).not.toContain('READOUT_CARD');

    const canvas = document.createElement('canvas');
    canvas.width = magneticMirrorConstants.fieldWidth;
    canvas.height = magneticMirrorConstants.baseHeight;
    const view = createMagneticMirrorView({ canvas, theme: 'light' });
    const ctx = canvas.getContext('2d');
    expect(ctx).not.toBeNull();
    const fillText = vi.spyOn(ctx as CanvasRenderingContext2D, 'fillText');
    view.render(createMagneticMirrorSim().getState());
    const labels = fillText.mock.calls.map((call) => String(call[0]));
    expect(labels).toEqual(expect.arrayContaining(['弱磁场', '镜区', 'x 轴']));
    expect(labels.join('\n')).not.toMatch(/物理关系|动能 Eₖ|磁矩 μ|Rₘ =/);
    expect(labels.some((label) => label.includes('v∥'))).toBe(true);
    view.dispose();
  });
});
