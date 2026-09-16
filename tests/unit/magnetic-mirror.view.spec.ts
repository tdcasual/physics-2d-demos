import { describe, expect, it } from 'vitest';
import {
  magneticMirrorStageTransform,
  type MagneticMirrorStageLayout
} from '../../src/scenes/magnetic-mirror/scene.view';

describe('magnetic mirror stage geometry', () => {
  it('keeps a docked-bottom readout clear of the full animation stage', () => {
    const layout: MagneticMirrorStageLayout = {
      floatingReadout: true,
      overlayTopPx: 265,
      overlayHeightPx: 158
    };
    const pose = magneticMirrorStageTransform(1280, 423, layout);
    expect(pose.offsetY + pose.boxH * pose.fit).toBeLessThanOrEqual(249 + 1e-6);
    expect(pose.offsetX + pose.boxW * pose.fit).toBeLessThanOrEqual(
      1280 + 1e-6
    );
  });

  it('uses the non-floating contain geometry on mobile stacks', () => {
    const pose = magneticMirrorStageTransform(390, 480, {
      floatingReadout: false
    });
    expect(pose.floatingReadout).toBe(false);
    expect(pose.fit).toBeCloseTo(Math.min(390 / pose.boxW, 480 / pose.boxH), 6);
    expect(pose.offsetX).toBeGreaterThanOrEqual(0);
    expect(pose.offsetY).toBeGreaterThanOrEqual(0);
  });
});
