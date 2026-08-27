import { describe, expect, it } from 'vitest';
import {
  createInterferenceVernierCaliper,
  interferenceVernierCaliperFactory
} from '../../src/instruments/interference-vernier-caliper/instrument.entry';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';
import {
  createMicrometerEyepiece,
  micrometerEyepieceFactory
} from '../../src/instruments/micrometer-eyepiece/instrument.entry';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';
import {
  createSpiralMicrometer,
  spiralMicrometerFactory
} from '../../src/instruments/spiral-micrometer/instrument.entry';
import { spiralMicrometerMeta } from '../../src/instruments/spiral-micrometer/instrument.meta';
import {
  createVernierCaliper,
  vernierCaliperFactory
} from '../../src/instruments/vernier-caliper/instrument.entry';
import { vernierCaliperMeta } from '../../src/instruments/vernier-caliper/instrument.meta';
import type { InterferenceVernierCaliperView } from '../../src/instruments/interference-vernier-caliper/instrument.view';
import type { MicrometerEyepieceView } from '../../src/instruments/micrometer-eyepiece/instrument.view';
import type { SpiralMicrometerView } from '../../src/instruments/spiral-micrometer/instrument.view';
import type { VernierCaliperView } from '../../src/instruments/vernier-caliper/instrument.view';

function createCanvasHost() {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  return canvas;
}

describe('instrument entries', () => {
  describe('interference-vernier-caliper', () => {
    it('exposes the meta on the factory', () => {
      expect(interferenceVernierCaliperFactory.meta).toBe(
        interferenceVernierCaliperMeta
      );
      expect(interferenceVernierCaliperFactory.meta.id).toBe(
        'interference-vernier-caliper'
      );
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = interferenceVernierCaliperFactory.createSim();
      const s = sim.getState();
      expect(s.currentReading).toBe(
        interferenceVernierCaliperMeta.defaultParams.initialReading
      );
      expect(s.zeroOffset).toBe(
        interferenceVernierCaliperMeta.defaultParams.zeroOffset
      );
      expect(s.fringeSpacing).toBe(
        interferenceVernierCaliperMeta.defaultParams.fringeSpacing
      );
    });

    it('createView satisfies the InstrumentView + measurable contract', () => {
      const canvas = createCanvasHost();
      // 工厂契约类型仅声明 InstrumentView，此处收窄到具体视图类型以覆盖扩展接口
      const view = interferenceVernierCaliperFactory.createView({
        canvas,
        theme: 'dark'
      }) as InterferenceVernierCaliperView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'getReading',
        'onReadingChange',
        'onAlign',
        'onLimit',
        'serialize',
        'deserialize',
        'setZero',
        'getZero',
        'getCalibrationOffset',
        'setReadoutVisible'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createInterferenceVernierCaliper assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createInterferenceVernierCaliper({
        canvas,
        theme: 'dark'
      });
      expect(sim.getState().currentReading).toBe(1.4);
      expect(view.getReading()).toBeCloseTo(1.4, 10);
      view.dispose();
    });
  });

  describe('micrometer-eyepiece', () => {
    it('exposes the meta on the factory', () => {
      expect(micrometerEyepieceFactory.meta).toBe(micrometerEyepieceMeta);
      expect(micrometerEyepieceFactory.meta.id).toBe('micrometer-eyepiece');
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = micrometerEyepieceFactory.createSim();
      const s = sim.getState();
      expect(s.currentReading).toBe(
        micrometerEyepieceMeta.defaultParams.initialReading
      );
      expect(s.stripeSpacing).toBe(
        micrometerEyepieceMeta.defaultParams.stripeSpacing
      );
      expect(s.viewMode).toBe(micrometerEyepieceMeta.defaultParams.viewMode);
    });

    it('createView satisfies the InstrumentView + measurable contract', () => {
      const canvas = createCanvasHost();
      // 工厂契约类型仅声明 InstrumentView，此处收窄到具体视图类型以覆盖扩展接口
      const view = micrometerEyepieceFactory.createView({
        canvas,
        theme: 'dark'
      }) as MicrometerEyepieceView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'getReading',
        'onReadingChange',
        'onAlign',
        'onLimit',
        'serialize',
        'deserialize',
        'setZero',
        'getZero',
        'getCalibrationOffset',
        'setReadoutVisible'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createMicrometerEyepiece assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createMicrometerEyepiece({ canvas, theme: 'dark' });
      expect(sim.getState().currentReading).toBe(0);
      expect(view.getReading()).toBe(0);
      view.dispose();
    });
  });

  describe('spiral-micrometer', () => {
    it('exposes the meta on the factory', () => {
      expect(spiralMicrometerFactory.meta).toBe(spiralMicrometerMeta);
      expect(spiralMicrometerFactory.meta.id).toBe('spiral-micrometer');
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = spiralMicrometerFactory.createSim();
      const s = sim.getState();
      expect(s.reading).toBe(spiralMicrometerMeta.defaultParams.reading);
      expect(s.currentReading).toBe(spiralMicrometerMeta.defaultParams.reading);
    });

    it('createView satisfies the InstrumentView + setMode contract', () => {
      const canvas = createCanvasHost();
      const view = spiralMicrometerFactory.createView({
        canvas,
        theme: 'dark'
      }) as SpiralMicrometerView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'setMode'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createSpiralMicrometer assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createSpiralMicrometer({ canvas, theme: 'dark' });
      expect(sim.getState().reading).toBe(6.725);
      expect(typeof view.setMode).toBe('function');
      view.dispose();
    });
  });

  describe('vernier-caliper', () => {
    it('exposes the meta on the factory', () => {
      expect(vernierCaliperFactory.meta).toBe(vernierCaliperMeta);
      expect(vernierCaliperFactory.meta.id).toBe('vernier-caliper');
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = vernierCaliperFactory.createSim();
      const s = sim.getState();
      expect(s.params.precision).toBe(
        vernierCaliperMeta.defaultParams.precision
      );
      expect(s.params.objectType).toBe(
        vernierCaliperMeta.defaultParams.objectType
      );
      // 默认 0.02mm 精度 + 小球（5.24mm）：主尺 5mm，游标第 12 格对齐
      expect(s.vernierDivisions).toBe(50);
      expect(s.currentReading).toBeCloseTo(5.24, 10);
    });

    it('createView satisfies the InstrumentView + setMode contract', () => {
      const canvas = createCanvasHost();
      const view = vernierCaliperFactory.createView({
        canvas,
        theme: 'dark'
      }) as VernierCaliperView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'setMode'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createVernierCaliper assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createVernierCaliper({ canvas, theme: 'dark' });
      expect(sim.getState().objectName).toBe('小球直径');
      expect(typeof view.setMode).toBe('function');
      view.dispose();
    });
  });
});
