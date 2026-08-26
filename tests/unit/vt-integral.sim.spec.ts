import { describe, expect, it } from 'vitest';
import { createVtIntegralSim } from '../../src/scenes/vt-integral/scene.sim';

describe('vt-integral sim', () => {
  it('reduces or keeps scene1 area error when rectangle count increases', () => {
    const sim = createVtIntegralSim({
      scene: 'scene1',
      rects: 4,
      method: 'mid',
      time: 5
    });
    const before = sim.getSnapshot().metrics.absErr;
    sim.setRects(20);
    const after = sim.getSnapshot().metrics.absErr;
    expect(after).toBeLessThanOrEqual(before + 1e-6);
  });
});
