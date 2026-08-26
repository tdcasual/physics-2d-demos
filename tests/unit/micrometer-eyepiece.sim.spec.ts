import { describe, expect, it } from 'vitest';
import { createMicrometerEyepieceSim } from '../../src/instruments/micrometer-eyepiece/instrument.sim';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';

const defaultParams = micrometerEyepieceMeta.defaultParams;

describe('micrometer-eyepiece sim', () => {
  describe('initial state', () => {
    it('maps every default param into state', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      const s = sim.getState();
      expect(s.currentReading).toBe(0);
      expect(s.zeroOffset).toBe(0);
      expect(s.stripeOffset).toBe(12);
      expect(s.stripeSpacing).toBe(50);
      expect(s.stripeColor).toBe('rgba(200, 80, 20, 0.4)');
      expect(s.stripeAngle).toBe(90);
      expect(s.viewMode).toBe('fringe');
    });

    it('defaults crosshairSpeed=100, scaleInverted=false, crosshairAngle=0', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      const s = sim.getState();
      expect(s.crosshairSpeed).toBe(100);
      expect(s.scaleInverted).toBe(false);
      expect(s.crosshairAngle).toBe(0);
    });

    it('honours explicit optional params', () => {
      const sim = createMicrometerEyepieceSim({
        ...defaultParams,
        crosshairSpeed: 50,
        scaleInverted: true,
        crosshairAngle: 90
      });
      const s = sim.getState();
      expect(s.crosshairSpeed).toBe(50);
      expect(s.scaleInverted).toBe(true);
      expect(s.crosshairAngle).toBe(90);
    });
  });

  describe('setParams', () => {
    it('updates every supported key', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      sim.setParams({
        initialReading: 5.5,
        zeroOffset: 0.02,
        stripeOffset: 300,
        stripeSpacing: 80,
        stripeColor: 'rgba(0,0,255,0.5)',
        stripeAngle: 45,
        viewMode: 'crosshair',
        crosshairSpeed: 200,
        scaleInverted: true,
        crosshairAngle: 30
      });
      const s = sim.getState();
      expect(s.currentReading).toBe(5.5);
      expect(s.zeroOffset).toBe(0.02);
      expect(s.stripeOffset).toBe(300);
      expect(s.stripeSpacing).toBe(80);
      expect(s.stripeColor).toBe('rgba(0,0,255,0.5)');
      expect(s.stripeAngle).toBe(45);
      expect(s.viewMode).toBe('crosshair');
      expect(s.crosshairSpeed).toBe(200);
      expect(s.scaleInverted).toBe(true);
      expect(s.crosshairAngle).toBe(30);
    });

    it('partial update leaves untouched keys unchanged', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      sim.setParams({ initialReading: 1.25 });
      const s = sim.getState();
      expect(s.currentReading).toBe(1.25);
      expect(s.stripeSpacing).toBe(50);
      expect(s.stripeAngle).toBe(90);
      expect(s.viewMode).toBe('fringe');
    });
  });

  describe('reset', () => {
    it('restores reading, zero offset, stripe params and view mode', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      sim.setParams({
        initialReading: 9.9,
        zeroOffset: 0.1,
        stripeOffset: 500,
        stripeSpacing: 100,
        stripeColor: 'rgba(1,2,3,0.4)',
        stripeAngle: 10,
        viewMode: 'crosshair'
      });
      sim.reset();
      const s = sim.getState();
      expect(s.currentReading).toBe(0);
      expect(s.zeroOffset).toBe(0);
      expect(s.stripeOffset).toBe(12);
      expect(s.stripeSpacing).toBe(50);
      expect(s.stripeColor).toBe('rgba(200, 80, 20, 0.4)');
      expect(s.stripeAngle).toBe(90);
      expect(s.viewMode).toBe('fringe');
    });

    it('restores crosshairSpeed, scaleInverted and crosshairAngle to initial values', () => {
      const sim = createMicrometerEyepieceSim({
        ...defaultParams,
        crosshairSpeed: 50,
        scaleInverted: true,
        crosshairAngle: 90
      });
      sim.setParams({
        crosshairSpeed: 250,
        scaleInverted: false,
        crosshairAngle: 45
      });
      sim.reset();
      const s = sim.getState();
      expect(s.crosshairSpeed).toBe(50);
      expect(s.scaleInverted).toBe(true);
      expect(s.crosshairAngle).toBe(90);
    });
  });

  describe('step', () => {
    it('is a no-op (interactive-only instrument)', () => {
      const sim = createMicrometerEyepieceSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after).toBe(before);
    });
  });
});
