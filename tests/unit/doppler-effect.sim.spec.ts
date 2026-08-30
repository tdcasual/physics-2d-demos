import { describe, expect, it } from 'vitest';
import {
  createDopplerSim,
  SOUND_SPEED,
  CANVAS_MIN,
  CANVAS_MAX
} from '../../src/scenes/doppler-effect/scene.sim';

// 公式基准：f_recv = f_emit × (v_sound + v_obs) / (v_sound − v_src)
// 默认几何：sourceX = 15，observerX = 25（观察者在波源右侧，dist >= 0）

describe('doppler-effect sim', () => {
  describe('received frequency formula', () => {
    it('equals emit frequency when both source and observer are static', () => {
      const sim = createDopplerSim({ emitFrequency: 3 });
      const s = sim.getState();
      expect(s.receivedFrequency).toBeCloseTo(3, 6);
      expect(s.frequencyChangePct).toBeCloseTo(0, 6);
    });

    it('raises frequency when source moves toward observer', () => {
      // v_src = +3（朝观察者）→ f = 3 × 6 / (6 − 3) = 6 Hz
      const sim = createDopplerSim({ sourceSpeed: 3, emitFrequency: 3 });
      const s = sim.getState();
      expect(s.receivedFrequency).toBeCloseTo(6, 6);
      expect(s.frequencyChangePct).toBeCloseTo(100, 4);
    });

    it('lowers frequency when source moves away from observer', () => {
      // v_src = −3 → f = 3 × 6 / (6 + 3) = 2 Hz
      const sim = createDopplerSim({ sourceSpeed: -3, emitFrequency: 3 });
      expect(sim.getState().receivedFrequency).toBeCloseTo(2, 6);
    });

    it('lowers frequency when observer moves away from source', () => {
      // observerSpeed = +3（向右，远离）→ f = 3 × (6 − 3) / 6 = 1.5 Hz
      const sim = createDopplerSim({
        observerSpeed: 3,
        emitFrequency: 3,
        mode: 'observer-moving'
      });
      expect(sim.getState().receivedFrequency).toBeCloseTo(1.5, 6);
    });

    it('raises frequency when observer moves toward source', () => {
      // observerSpeed = −3（向左，靠近）→ f = 3 × (6 + 3) / 6 = 4.5 Hz
      const sim = createDopplerSim({
        observerSpeed: -3,
        emitFrequency: 3,
        mode: 'observer-moving'
      });
      expect(sim.getState().receivedFrequency).toBeCloseTo(4.5, 6);
    });

    it('matches first-order equivalence between source-moving and observer-moving at small speeds', () => {
      // 低速极限下两种情形都趋近 f(1 + u/v)，允许二阶差异 (u/v)²
      const u = 0.3;
      const f = 5;
      const bySource = createDopplerSim({
        sourceSpeed: u,
        emitFrequency: f
      }).getState().receivedFrequency;
      const byObserver = createDopplerSim({
        observerSpeed: -u,
        emitFrequency: f,
        mode: 'observer-moving'
      }).getState().receivedFrequency;
      const firstOrder = f * (1 + u / SOUND_SPEED);
      expect(bySource).toBeCloseTo(firstOrder, 1);
      expect(byObserver).toBeCloseTo(firstOrder, 1);
    });

    it('mirrors the formula when observer is on the left of the source', () => {
      // 观察者在左（dist < 0）：sourceSpeed = +3 实为远离 → f = 2 Hz
      const sim = createDopplerSim({ sourceSpeed: 3, emitFrequency: 3 });
      sim.setObserverX(5);
      expect(sim.getState().receivedFrequency).toBeCloseTo(2, 6);
    });

    it('caps frequency at the sonic-barrier guard instead of diverging', () => {
      // v_src → v_sound 时分母趋零，走保护分支 f × 100
      const sim = createDopplerSim({
        sourceSpeed: SOUND_SPEED,
        emitFrequency: 3
      });
      expect(sim.getState().receivedFrequency).toBeCloseTo(300, 6);
    });
  });

  describe('wavelengths and mach number', () => {
    it('splits wavelength symmetrically around the standard for a moving source', () => {
      // f = 3 → λ0 = 2；v = 3 → front = 1，back = 3
      const sim = createDopplerSim({ sourceSpeed: 3, emitFrequency: 3 });
      const s = sim.getState();
      expect(s.wavelengthStandard).toBeCloseTo(2, 6);
      expect(s.wavelengthFront).toBeCloseTo(1, 6);
      expect(s.wavelengthBack).toBeCloseTo(3, 6);
      expect(s.machNumber).toBeCloseTo(0.5, 6);
    });

    it('keeps isotropic wavelength for a static source', () => {
      const sim = createDopplerSim({ emitFrequency: 2 });
      const s = sim.getState();
      expect(s.wavelengthStandard).toBeCloseTo(3, 6);
      expect(s.wavelengthFront).toBeCloseTo(s.wavelengthStandard, 6);
      expect(s.wavelengthBack).toBeCloseTo(s.wavelengthStandard, 6);
    });

    it('collapses the front wavelength at sonic speed', () => {
      const sim = createDopplerSim({
        sourceSpeed: SOUND_SPEED,
        emitFrequency: 3
      });
      const s = sim.getState();
      expect(s.wavelengthFront).toBe(0);
      expect(s.wavelengthBack).toBe(Infinity);
      expect(s.machNumber).toBeCloseTo(1, 6);
    });
  });

  describe('mode switching and bounds', () => {
    it('zeroes the other speed when switching mode', () => {
      const sim = createDopplerSim({ sourceSpeed: 2, observerSpeed: 1 });
      const after = sim.setParams({ mode: 'observer-moving' });
      expect(after.sourceSpeed).toBe(0);
      expect(sim.getState().params.observerSpeed).toBe(1);
    });

    it('clamps entity positions to the canvas range', () => {
      const sim = createDopplerSim();
      sim.setSourceX(999);
      sim.setObserverX(-5);
      const s = sim.getState();
      expect(s.sourceX).toBe(CANVAS_MAX);
      expect(s.observerX).toBe(CANVAS_MIN);
    });
  });

  describe('wave ring emission', () => {
    it('emits rings at the configured period from a static source', () => {
      const sim = createDopplerSim({ emitFrequency: 4 }); // 周期 0.25 s
      // 推进约 1 秒
      for (let i = 0; i < 60; i++) sim.step(1 / 60);
      const rings = sim.getState().waveRings;
      expect(rings.length).toBeGreaterThanOrEqual(3);
      expect(rings.length).toBeLessThanOrEqual(5);
      // 静止波源：所有环从同一位置发出
      for (const ring of rings) {
        expect(ring.x).toBeCloseTo(15, 6);
      }
      // 相邻环的半径差 ≈ 一个周期内波传播的距离 = λ0
      // （发射按帧推进量化，容差取一帧的传播距离）
      const s = sim.getState();
      const frameTravel = SOUND_SPEED / 60;
      const radii = rings.map((r) => SOUND_SPEED * (s.time - r.birthTime));
      for (let i = 1; i < radii.length; i++) {
        expect(
          Math.abs(Math.abs(radii[i - 1] - radii[i]) - s.wavelengthStandard)
        ).toBeLessThanOrEqual(frameTravel + 1e-6);
      }
    });

    it('compresses ring center spacing ahead of a moving source', () => {
      // 相邻环心间距 = v_src × T（< λ0）；波前间距 (v−v_src)T = λ_front 已在波长断言覆盖
      const sim = createDopplerSim({ sourceSpeed: 2, emitFrequency: 2 });
      for (let i = 0; i < 90; i++) sim.step(1 / 60);
      const s = sim.getState();
      expect(s.waveRings.length).toBeGreaterThanOrEqual(2);
      const xs = s.waveRings.map((r) => r.x);
      const spacing = Math.abs(xs[xs.length - 1] - xs[xs.length - 2]);
      const frameTravel = (2 * 1) / 60; // v_src × 一帧
      expect(spacing).toBeLessThan(s.wavelengthStandard);
      expect(Math.abs(spacing - 2 / 2)).toBeLessThanOrEqual(frameTravel + 1e-6);
    });
  });

  describe('lifecycle', () => {
    it('reset restores defaults and clears wave rings', () => {
      const sim = createDopplerSim({ sourceSpeed: 3, emitFrequency: 8 });
      for (let i = 0; i < 30; i++) sim.step(1 / 60);
      sim.reset();
      const s = sim.getState();
      expect(s.params.sourceSpeed).toBe(0);
      expect(s.params.emitFrequency).toBe(3);
      expect(s.time).toBe(0);
      expect(s.sourceX).toBe(15);
      expect(s.observerX).toBe(25);
      expect(s.waveRings).toHaveLength(0);
      expect(s.receivedFrequency).toBeCloseTo(3, 6);
    });

    it('playbackSpeed scales simulated time', () => {
      const sim = createDopplerSim({ playbackSpeed: 2 });
      sim.step(0.5);
      expect(sim.getState().time).toBeCloseTo(1.0, 6);
    });
  });
});
