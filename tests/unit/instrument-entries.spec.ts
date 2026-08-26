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
import type { InterferenceVernierCaliperView } from '../../src/instruments/interference-vernier-caliper/instrument.view';
import type { MicrometerEyepieceView } from '../../src/instruments/micrometer-eyepiece/instrument.view';

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
});
