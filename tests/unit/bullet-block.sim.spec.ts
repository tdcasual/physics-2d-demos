import { describe, expect, it } from 'vitest';
import {
  bulletBlockCommonSpeed,
  bulletBlockConstants,
  bulletBlockMaxDepth,
  createBulletBlockSim,
  stageTransform
} from '../../src/scenes/bullet-block/scene.sim';

describe('bullet block simulation', () => {
  it('conserves momentum in the ideal common-speed model', () => {
    expect(bulletBlockCommonSpeed(25, 1, 5)).toBeCloseTo(25 / 6, 8);
  });

  it('computes penetration depth from relative kinetic energy', () => {
    expect(bulletBlockMaxDepth(25, 1, 5, 50)).toBeCloseTo(5.208333, 5);
  });

  it('clamps parameters and enters the impact phase after approach', () => {
    const sim = createBulletBlockSim({
      speed: 99,
      bulletMass: -1,
      blockMass: 99,
      resistance: 0
    });
    expect(sim.getParams()).toMatchObject({
      speed: 45,
      bulletMass: 0.2,
      blockMass: 12,
      resistance: 5
    });
    sim.step(0.2);
    expect(sim.getState().phase).toBe('approach');
    sim.step(0.2);
    expect(['embed', 'coast']).toContain(sim.getState().phase);
  });

  it('conserves momentum throughout embedding and matches heat to f·d', () => {
    const sim = createBulletBlockSim();
    sim.step(0.5);
    const during = sim.getState();
    expect(during.phase).toBe('embed');
    expect(during.totalMomentum).toBeCloseTo(during.initialMomentum, 8);
    expect(during.penetration).toBeGreaterThan(0);

    sim.step(2);
    const final = sim.getState();
    expect(final.phase).toBe('coast');
    expect(final.bulletSpeed).toBeCloseTo(final.commonSpeed, 8);
    expect(final.blockSpeed).toBeCloseTo(final.commonSpeed, 8);
    expect(final.totalMomentum).toBeCloseTo(final.initialMomentum, 8);
    expect(final.penetration).toBeCloseTo(final.maxDepth, 8);
    expect(final.heat).toBeCloseTo(
      final.params.resistance * final.penetration,
      8
    );
  });

  it('resets both parameters and positions to the default experiment', () => {
    const sim = createBulletBlockSim({ speed: 40, bulletMass: 2 });
    sim.step(1);
    sim.reset();
    expect(sim.getParams()).toEqual({
      speed: 40,
      bulletMass: 2,
      blockMass: 5,
      resistance: 50
    });
    expect(sim.getState()).toMatchObject({
      phase: 'approach',
      time: 0,
      bulletX: 0,
      blockX: bulletBlockConstants.blockInitialX,
      penetration: 0
    });
  });

  it('keeps the chart clear of a floating readout on desktop', () => {
    const layout = stageTransform(862, 651, {
      floatingReadout: true,
      overlayPx: 218,
      overlayTopPx: 61,
      overlayHeightPx: 225
    });
    const chartRight =
      layout.offsetX +
      (bulletBlockConstants.chartLeft + bulletBlockConstants.chartWidth) *
        layout.fit;
    expect(chartRight).toBeLessThanOrEqual(862 - 218 - 16 + 1e-6);
    expect(
      layout.offsetY + bulletBlockConstants.baseHeight * layout.fit
    ).toBeLessThanOrEqual(651 + 1e-6);
  });
});
