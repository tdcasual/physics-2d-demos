import { describe, expect, it } from 'vitest';
import { createInterferenceVernierCaliperSim } from '../../src/instruments/interference-vernier-caliper/instrument.sim';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';

const defaultParams = interferenceVernierCaliperMeta.defaultParams;

describe('interference-vernier-caliper sim', () => {
  describe('initial state', () => {
    it('maps every default param into state', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      const s = sim.getState();
      expect(s.currentReading).toBe(1.4);
      expect(s.zeroOffset).toBe(0);
      expect(s.fringeSpacing).toBe(16);
      expect(s.fringeBlur).toBe(1.5);
      expect(s.fringeOpacity).toBe(0.85);
      expect(s.fringeEnvelopeWidth).toBe(320);
      expect(s.fringeColor).toBe('rgba(30,15,0,0.85)');
    });

    it('defaults crosshairAngle=0 and viewMode=fringe when omitted', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      const s = sim.getState();
      expect(s.crosshairAngle).toBe(0);
      expect(s.viewMode).toBe('fringe');
    });

    it('honours explicit crosshairAngle and viewMode', () => {
      const sim = createInterferenceVernierCaliperSim({
        ...defaultParams,
        crosshairAngle: 90,
        viewMode: 'crosshair'
      });
      const s = sim.getState();
      expect(s.crosshairAngle).toBe(90);
      expect(s.viewMode).toBe('crosshair');
    });
  });

  describe('setParams', () => {
    it('updates every supported key', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      sim.setParams({
        initialReading: 0.5,
        zeroOffset: -0.02,
        fringeSpacing: 24,
        fringeBlur: 2.5,
        fringeOpacity: 0.5,
        fringeEnvelopeWidth: 400,
        fringeColor: 'rgba(0,0,255,0.5)',
        crosshairAngle: 45,
        viewMode: 'crosshair'
      });
      const s = sim.getState();
      expect(s.currentReading).toBe(0.5);
      expect(s.zeroOffset).toBe(-0.02);
      expect(s.fringeSpacing).toBe(24);
      expect(s.fringeBlur).toBe(2.5);
      expect(s.fringeOpacity).toBe(0.5);
      expect(s.fringeEnvelopeWidth).toBe(400);
      expect(s.fringeColor).toBe('rgba(0,0,255,0.5)');
      expect(s.crosshairAngle).toBe(45);
      expect(s.viewMode).toBe('crosshair');
    });

    it('partial update leaves untouched keys unchanged', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      sim.setParams({ initialReading: 2.0 });
      const s = sim.getState();
      expect(s.currentReading).toBe(2.0);
      expect(s.fringeSpacing).toBe(16);
      expect(s.fringeColor).toBe('rgba(30,15,0,0.85)');
      expect(s.viewMode).toBe('fringe');
    });
  });

  describe('reset', () => {
    it('restores all initial params', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      sim.setParams({
        initialReading: 0.1,
        zeroOffset: 0.05,
        fringeSpacing: 40,
        fringeBlur: 5,
        fringeOpacity: 0.1,
        fringeEnvelopeWidth: 600,
        fringeColor: 'rgba(1,2,3,0.4)',
        crosshairAngle: 90,
        viewMode: 'crosshair'
      });
      sim.reset();
      const s = sim.getState();
      expect(s.currentReading).toBe(1.4);
      expect(s.zeroOffset).toBe(0);
      expect(s.fringeSpacing).toBe(16);
      expect(s.fringeBlur).toBe(1.5);
      expect(s.fringeOpacity).toBe(0.85);
      expect(s.fringeEnvelopeWidth).toBe(320);
      expect(s.fringeColor).toBe('rgba(30,15,0,0.85)');
      expect(s.viewMode).toBe('fringe');
    });

    it('resets crosshairAngle to the initial value', () => {
      const sim = createInterferenceVernierCaliperSim({
        ...defaultParams,
        crosshairAngle: 90
      });
      sim.setParams({ crosshairAngle: 45 });
      sim.reset();
      expect(sim.getState().crosshairAngle).toBe(90);
    });
  });

  describe('step', () => {
    it('is a no-op (interactive-only instrument)', () => {
      const sim = createInterferenceVernierCaliperSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after).toBe(before);
    });
  });
});
