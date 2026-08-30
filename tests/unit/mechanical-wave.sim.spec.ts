import { describe, expect, it } from 'vitest';
import {
  createMechanicalWaveSim,
  waveY,
  waveVelocity,
  waveAcceleration
} from '../../src/scenes/mechanical-wave/scene.sim';

// 模型基准：y = A sin(kx − dir·ωt)，约束 v = λ/T（最近调节的两个参数独立，第三个自动计算）

describe('mechanical-wave sim', () => {
  describe('waveY pure function', () => {
    it('hits amplitude at quarter wavelength', () => {
      // x = λ/4, t = 0 → sin(π/2) = 1 → y = A
      expect(waveY(1, 0, 5, 4, 2, 1)).toBeCloseTo(5, 10);
      expect(waveY(3, 0, 5, 4, 2, 1)).toBeCloseTo(-5, 10);
    });

    it('is bounded by amplitude for arbitrary x and t', () => {
      for (const x of [0, 0.7, 3.3, 11.9]) {
        for (const t of [0, 0.13, 1.7, 5.4]) {
          expect(Math.abs(waveY(x, t, 5, 4, 2, 1))).toBeLessThanOrEqual(5);
        }
      }
    });

    it('is periodic in x with period λ and in t with period T', () => {
      const y0 = waveY(2.3, 0.7, 5, 4, 2, 1);
      expect(waveY(2.3 + 4, 0.7, 5, 4, 2, 1)).toBeCloseTo(y0, 10);
      expect(waveY(2.3, 0.7 + 2, 5, 4, 2, 1)).toBeCloseTo(y0, 10);
    });

    it('travels right for dir=1 and left for dir=-1', () => {
      // y(x, t+dt, dir=1) = y(x − v·dt, t)，其中 v = λ/T
      const [A, lambda, T] = [5, 4, 2];
      const v = lambda / T;
      const dt = 0.3;
      const x = 7.5;
      const t = 0.9;
      expect(waveY(x, t + dt, A, lambda, T, 1)).toBeCloseTo(
        waveY(x - v * dt, t, A, lambda, T, 1),
        10
      );
      expect(waveY(x, t + dt, A, lambda, T, -1)).toBeCloseTo(
        waveY(x + v * dt, t, A, lambda, T, -1),
        10
      );
    });
  });

  describe('waveVelocity / waveAcceleration pure functions', () => {
    it('waveVelocity is the time derivative of waveY', () => {
      const [A, lambda, T, dir] = [5, 4, 2, 1];
      const eps = 1e-6;
      for (const [x, t] of [
        [2.3, 0.7],
        [8.1, 1.9]
      ]) {
        const numeric =
          (waveY(x, t + eps, A, lambda, T, dir) -
            waveY(x, t - eps, A, lambda, T, dir)) /
          (2 * eps);
        expect(waveVelocity(x, t, A, lambda, T, dir)).toBeCloseTo(numeric, 4);
      }
    });

    it('waveAcceleration satisfies a = −ω²y (SHM)', () => {
      const T = 2;
      const omega = (2 * Math.PI) / T;
      for (const y of [0, 2.5, -4.8]) {
        expect(waveAcceleration(y, T)).toBeCloseTo(-omega * omega * y, 10);
      }
    });
  });

  describe('v = λ/T constraint system', () => {
    it('defaults to wavelength/period independent, waveSpeed dependent', () => {
      const sim = createMechanicalWaveSim();
      const s = sim.getState();
      expect(s.constraint.dependent).toBe('waveSpeed');
      expect(s.params.waveSpeed).toBeCloseTo(
        s.params.wavelength / s.params.period,
        10
      );
    });

    it('recomputes the dependent parameter when an independent one changes', () => {
      const sim = createMechanicalWaveSim();
      // 默认独立：wavelength, period。改 waveSpeed → 独立集变 {waveSpeed, wavelength}，period 因变
      const after = sim.setParam('waveSpeed', 4);
      expect(after.period).toBeCloseTo(after.wavelength / 4, 10);
      expect(sim.getConstraint().dependent).toBe('period');
    });

    it('clamps the dependent parameter and cascades to keep v = λ/T', () => {
      const sim = createMechanicalWaveSim({ wavelength: 10, period: 2 });
      // 改 wavelength → 独立 {wavelength, period}，waveSpeed 因变
      sim.setParam('wavelength', 10);
      // 改 period = 0.5 → waveSpeed = 10/0.5 = 20 超上限，clamp 到 10，
      // 级联调整较早独立变量 wavelength = v·T = 5
      const after = sim.setParam('period', 0.5);
      expect(after.waveSpeed).toBe(10);
      expect(after.wavelength).toBeCloseTo(5, 10);
      expect(after.waveSpeed).toBeCloseTo(after.wavelength / after.period, 10);
    });

    it('never violates v = λ/T across a sweep of valid adjustments', () => {
      const sim = createMechanicalWaveSim();
      const rangeOf: Record<string, [number, number]> = {
        waveSpeed: [0.5, 10],
        wavelength: [1, 10],
        period: [0.5, 8]
      };
      for (const key of ['waveSpeed', 'wavelength', 'period'] as const) {
        for (const value of [0.5, 1, 3, 7.5, 10]) {
          const p = sim.setParam(key, value);
          // 不变量：v = λ/T 恒成立（直接设置的参数自身不做 clamp，
          // 但依赖它的因变量/级联变量必须落在合法区间）
          expect(p.waveSpeed).toBeCloseTo(p.wavelength / p.period, 6);
          const dep = sim.getConstraint().dependent;
          const [lo, hi] = rangeOf[dep];
          expect(p[dep]).toBeGreaterThanOrEqual(lo);
          expect(p[dep]).toBeLessThanOrEqual(hi);
        }
      }
    });

    it('ignores constraint logic for non-wave params', () => {
      const sim = createMechanicalWaveSim();
      const before = sim.getConstraint();
      sim.setParam('amplitude', 8);
      expect(sim.getConstraint()).toEqual(before);
      expect(sim.getState().params.amplitude).toBe(8);
    });
  });

  describe('point P observation', () => {
    it('reports pointPY/pointPVy/pointPAy consistent with the wave functions', () => {
      const sim = createMechanicalWaveSim({
        amplitude: 6,
        wavelength: 5,
        period: 2.5
      });
      sim.setPointP(3.7);
      sim.step(0.4);
      const s = sim.getState();
      const p = s.params;
      expect(s.pointPY).toBeCloseTo(
        waveY(3.7, s.time, p.amplitude, p.wavelength, p.period, 1),
        10
      );
      expect(s.pointPVy).toBeCloseTo(
        waveVelocity(3.7, s.time, p.amplitude, p.wavelength, p.period, 1),
        10
      );
      expect(s.pointPAy).toBeCloseTo(waveAcceleration(s.pointPY, p.period), 10);
    });

    it('clamps point P to [0, 12]', () => {
      const sim = createMechanicalWaveSim();
      sim.setPointP(-3);
      expect(sim.getState().pointPX).toBe(0);
      sim.setPointP(99);
      expect(sim.getState().pointPX).toBe(12);
    });

    it('classifies velocity/acceleration direction with a 0.05 deadband', () => {
      const sim = createMechanicalWaveSim();
      // 找一个 vy 明显为正/负的时刻
      sim.setPointP(1); // x = λ/4 → cos(kx − ωt) 在 t=0 时为 0 → vy = 0 → 'zero'
      expect(sim.getState().velocityDirection).toBe('zero');
      sim.step(0.25); // 相位推进 → cos 变正 → vy < 0 → 'down'
      expect(sim.getState().velocityDirection).toBe('down');
      expect(sim.getState().pointPY).toBeGreaterThan(0);
      expect(sim.getState().accelerationDirection).toBe('down'); // a = −ω²y
    });
  });

  describe('lifecycle', () => {
    it('step scales time by playbackSpeed', () => {
      const sim = createMechanicalWaveSim({ playbackSpeed: 1.5 });
      sim.step(0.4);
      expect(sim.getState().time).toBeCloseTo(0.6, 10);
    });

    it('reset restores defaults and constraint tracking', () => {
      const sim = createMechanicalWaveSim({ amplitude: 9, direction: 'left' });
      sim.setParam('waveSpeed', 7);
      sim.setPointP(11);
      sim.step(1);
      sim.reset();
      const s = sim.getState();
      expect(s.params.amplitude).toBe(5);
      expect(s.params.waveSpeed).toBe(2);
      expect(s.params.direction).toBe('right');
      expect(s.time).toBe(0);
      expect(s.pointPX).toBe(5);
      expect(s.constraint.dependent).toBe('waveSpeed');
    });
  });
});
