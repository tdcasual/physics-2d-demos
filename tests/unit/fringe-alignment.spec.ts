import { describe, expect, it } from 'vitest';
import { repeatingOffsetAlignment } from '../../src/instruments/_utils/fringe-alignment';
import {
  caliperFringeAlignment,
  sampleCaliperAlignedReadingsCm
} from '../../src/instruments/interference-vernier-caliper/renderer/alignment';
import { micrometerFringeAlignment } from '../../src/instruments/micrometer-eyepiece/renderer/alignment';
import { computeCaliperFringePx } from '../../src/scenes/double-slit/scene.sim';
import { computeRealDeltaXmm } from '../../src/scenes/double-slit/scene.sim';

describe('repeatingOffsetAlignment', () => {
  it('treats multiples of spacing as bright-fringe centres', () => {
    expect(repeatingOffsetAlignment(0, 50).aligned).toBe(true);
    expect(repeatingOffsetAlignment(50, 50).aligned).toBe(true);
    expect(repeatingOffsetAlignment(25, 50).aligned).toBe(false);
    expect(repeatingOffsetAlignment(1.5, 50).aligned).toBe(true);
    expect(repeatingOffsetAlignment(3, 50).aligned).toBe(false);
  });
});

describe('micrometerFringeAlignment', () => {
  it('matches the existing onAlign contract at stripeOffset 12', () => {
    const base = {
      initialReading: 0,
      stripeOffsetMm: 12,
      crosshairSpeed: 100,
      stripeSpacingPx: 50
    };
    expect(micrometerFringeAlignment({ ...base, readingMm: 12 }).aligned).toBe(
      true
    );
    expect(
      micrometerFringeAlignment({ ...base, readingMm: 12.25 }).aligned
    ).toBe(false);
    expect(
      micrometerFringeAlignment({ ...base, readingMm: 12.5 }).aligned
    ).toBe(true);
    expect(
      micrometerFringeAlignment({ ...base, readingMm: 12.5 }).fringeOrder
    ).toBe(1);
  });
});

describe('caliperFringeAlignment', () => {
  const fringeSpacingSimPx = computeCaliperFringePx(
    computeRealDeltaXmm(532, 20, 0.7)
  );

  it('only accepts sampled bright-fringe positions', () => {
    const samples = sampleCaliperAlignedReadingsCm(fringeSpacingSimPx, 4);
    expect(samples.length).toBeGreaterThanOrEqual(3);
    for (const sample of samples) {
      const hit = caliperFringeAlignment({
        readingCm: sample.readingCm,
        fringeSpacingSimPx
      });
      expect(hit.aligned).toBe(true);
      expect(hit.fringeOrder).toBe(sample.order);
      const miss = caliperFringeAlignment({
        readingCm: sample.readingCm + 0.04,
        fringeSpacingSimPx
      });
      expect(miss.aligned).toBe(false);
    }
  });
});
