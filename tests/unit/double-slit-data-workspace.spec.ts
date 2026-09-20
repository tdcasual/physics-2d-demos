import { describe, expect, it } from 'vitest';
import { createDoubleSlitScene } from '../../src/scenes/double-slit/scene.entry';
import { doubleSlitDataWorkspaceSpec } from '../../src/scenes/double-slit/data-task';
import { shouldShowChartAnalysis } from '../../src/platform/data-workspace';

function makeScene() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const parent = document.createElement('div');
  parent.style.width = '800px';
  parent.style.height = '600px';
  parent.appendChild(canvas);
  document.body.appendChild(parent);
  return createDoubleSlitScene({ canvas, theme: 'light' });
}

describe('double-slit data workspace host', () => {
  it('opts out of chart analysis', () => {
    expect(shouldShowChartAnalysis(doubleSlitDataWorkspaceSpec)).toBe(false);
  });

  it('keeps ordinary readout including theoretical Δx and instrument digits', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono' });
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(true);
    expect(items.some((item) => /532/.test(String(item.value)))).toBe(true);
    scene.dispose();
  });

  it('hides λ, theoretical Δx and instrument digits in workspace mode', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono' });
    const host = scene.getDataWorkspace();
    host.setActive(true);
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(false);
    expect(items.some((item) => item.key === 'caliper')).toBe(false);
    expect(items.some((item) => item.key === 'micrometer')).toBe(false);
    expect(items.some((item) => /532/.test(JSON.stringify(item)))).toBe(false);
    expect(items.some((item) => /Δx/.test(item.label))).toBe(false);
    expect(items.some((item) => item.key === 'd')).toBe(true);
    expect(items.some((item) => item.key === 'L')).toBe(true);
    scene.dispose();
  });

  it('does not rewrite params when the measurement condition is not met', () => {
    const scene = makeScene();
    scene.setParams({ step: 3, lightMode: 'white' });
    const before = scene.getState().params;
    const eligibility = scene.getDataWorkspace().getEligibility();
    expect(eligibility.ok).toBe(false);
    expect(scene.getState().params.step).toBe(before.step);
    expect(scene.getState().params.lightMode).toBe(before.lightMode);
    expect(scene.getState().params.lambda).toBe(before.lambda);
    scene.dispose();
  });

  it('restores ordinary readout after leaving the workspace', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono', lambda: 532 });
    const host = scene.getDataWorkspace();
    host.setActive(true);
    host.setActive(false);
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(true);
    expect(items.some((item) => /532/.test(String(item.value)))).toBe(true);
    scene.dispose();
  });
});
