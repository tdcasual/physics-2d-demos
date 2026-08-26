import { describe, it, expect } from 'vitest';
import { drawSpring } from '../../src/scenes/spring-oscillator/renderer/draw-spring';
import { drawOscillatorCell } from '../../src/scenes/spring-oscillator/renderer/draw-oscillator';
import {
  createEmptyChartState,
  createGraphCanvas,
  drawGraph,
  updateHistory
} from '../../src/scenes/spring-oscillator/renderer/draw-graph';
import { createSpringOscillatorSim } from '../../src/scenes/spring-oscillator/scene.sim';

describe('spring-oscillator renderer', () => {
  describe('draw-spring', () => {
    it('draws spring without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;

      expect(() =>
        drawSpring(ctx, 50, 100, 200, 100, 10, 15, '#3b82f6')
      ).not.toThrow();
    });
  });

  describe('draw-oscillator', () => {
    it('draws oscillator cell without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;

      const osc = {
        id: 'test-1',
        params: { k: 10, m: 1, x0: 5, orientation: 'horizontal' as const },
        state: { x: 3, v: 0, a: 0, t: 0, phase: 0 },
        initial: { x: 5, v: 0, a: 0, t: 0, phase: 0 },
        color: '#4db0ff',
        isPlaying: true,
        localTime: 0,
        startDelay: 0
      };

      expect(() =>
        drawOscillatorCell(ctx, osc, 0, 10, 10, 380, 280, 'dark', {
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws vertical oscillator without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;

      const osc = {
        id: 'test-2',
        params: { k: 10, m: 1, x0: -3, orientation: 'vertical' as const },
        state: { x: -2, v: 0, a: 0, t: 0, phase: Math.PI },
        initial: { x: -3, v: 0, a: 0, t: 0, phase: Math.PI },
        color: '#ff6b6b',
        isPlaying: false,
        localTime: 0,
        startDelay: 0
      };

      expect(() =>
        drawOscillatorCell(ctx, osc, 1, 10, 10, 380, 280, 'light', {
          responsiveScale: 1.2
        })
      ).not.toThrow();
    });
  });

  describe('draw-graph', () => {
    it('creates empty chart state', () => {
      const state = createEmptyChartState();
      expect(state.canvas).toBeNull();
      expect(state.ctx).toBeNull();
      expect(state.cssWidth).toBe(0);
      expect(state.cssHeight).toBe(0);
      expect(state.dpr).toBe(1);
    });

    it('creates graph canvas with dispose', () => {
      const parent = document.createElement('div');
      const canvas = document.createElement('canvas');
      parent.appendChild(canvas);
      const { state, dispose } = createGraphCanvas(parent, () => {});
      expect(state).toBeDefined();
      expect(typeof dispose).toBe('function');
      dispose();
    });

    it('draws graph without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;

      const sim = createSpringOscillatorSim();
      sim.addOscillator({ k: 10, m: 1, x0: 5, orientation: 'horizontal' });
      sim.step(0.1);
      sim.step(0.1);

      const history = new Map();

      expect(() =>
        drawGraph(ctx, sim, history, 'dark', 400, 200, 1, 1, canvas)
      ).not.toThrow();
    });

    it('updates history correctly', () => {
      const sim = createSpringOscillatorSim();
      sim.addOscillator({ k: 10, m: 1, x0: 5, orientation: 'horizontal' });
      sim.startOscillator(sim.oscillators[0].id);
      sim.step(0.1);

      const history = new Map<string, Array<{ t: number; x: number }>>();
      const result = updateHistory(sim, history, 'desktop', 0);

      expect(result.newFrameCount).toBe(1);

      const osc = sim.oscillators[0];
      const hist = history.get(osc.id);
      // hist may be initialized even if shouldRecord is false
      if (hist) {
        expect(Array.isArray(hist)).toBe(true);
      }
    });

    it('skips recording on mobile alternate frames', () => {
      const sim = createSpringOscillatorSim();
      sim.addOscillator({ k: 10, m: 1, x0: 5, orientation: 'horizontal' });
      sim.step(0.1);

      const history = new Map();
      const result1 = updateHistory(sim, history, 'mobile', 0);
      expect(result1.shouldRecord).toBe(false); // frame 1 % 2 !== 0
      expect(result1.newFrameCount).toBe(1);

      const result2 = updateHistory(sim, history, 'mobile', 1);
      expect(result2.shouldRecord).toBe(true); // frame 2 % 2 === 0
      expect(result2.newFrameCount).toBe(2);
    });
  });
});
