import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeSceneParams } from '../../src/app/url-sync';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import { variableWorkControlsSchema } from '../../src/scenes/variable-work/controls-schema';
import { createVariableWorkScene } from '../../src/scenes/variable-work/scene.entry';
import { restoredUrlParams } from '../../src/scenes/variable-work/scene.sim';

describe('variable-work chrome', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no duplicate autoRun transport toggle', () => {
    const keys = variableWorkControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('autoRun');
    expect(keys).toContain('mode');
    expect(keys).toContain('microsteps');
  });

  it('hides k in power mode and hides P0 in linear mode', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const renderer = renderSchema({
      mount,
      schema: variableWorkControlsSchema,
      onChange: () => undefined,
      onAction: () => undefined
    });
    renderer.setVisible('k', true);
    renderer.setVisible('power', false);
    const kRow = mount.querySelector('[data-control-key="k"]');
    const pRow = mount.querySelector('[data-control-key="power"]');
    expect(kRow).toBeTruthy();
    expect(pRow).toBeTruthy();
    expect((kRow as HTMLElement).style.display).not.toBe('none');
    expect((pRow as HTMLElement).style.display).toBe('none');
    renderer.setVisible('k', false);
    renderer.setVisible('power', true);
    expect((kRow as HTMLElement).style.display).toBe('none');
    expect((pRow as HTMLElement).style.display).not.toBe('none');
    renderer.dispose();
    mount.remove();
  });

  it('applies URL mode=1 to power preset and slider visibility', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const scene = createVariableWorkScene();
    const renderer = renderSchema({
      mount,
      schema: variableWorkControlsSchema,
      onChange: () => undefined,
      onAction: () => undefined
    });
    scene.setParams({ mode: 'power', mass: 3, power: 8 });
    renderer.setActive('mode', 'power');
    renderer.setVisible('k', false);
    renderer.setVisible('power', true);
    expect(scene.getParams().mode).toBe('power');
    const kRow = mount.querySelector('[data-control-key="k"]') as HTMLElement;
    const pRow = mount.querySelector(
      '[data-control-key="power"]'
    ) as HTMLElement;
    expect(kRow.style.display).toBe('none');
    expect(pRow.style.display).not.toBe('none');
    renderer.dispose();
    scene.dispose();
    mount.remove();
  });

  it('writes autoRun=1/0 into the URL on start, pause, and reset', async () => {
    vi.useFakeTimers();
    window.history.replaceState(
      {},
      '',
      '/src/pages/variable-work.html?autoRun=1&mass=2'
    );
    const scene = createVariableWorkScene();
    const syncUrl = () =>
      writeSceneParams(
        restoredUrlParams(
          scene.getParams(),
          scene.getTransportState().isPlaying
        )
      );
    expect(restoredUrlParams(scene.getParams(), false).autoRun).toBe(0);
    expect(restoredUrlParams(scene.getParams(), true).autoRun).toBe(1);

    scene.pauseAll();
    syncUrl();
    await vi.advanceTimersByTimeAsync(200);
    expect(new URL(window.location.href).searchParams.get('autoRun')).toBe('0');

    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    syncUrl();
    await vi.advanceTimersByTimeAsync(200);
    expect(new URL(window.location.href).searchParams.get('autoRun')).toBe('1');

    scene.reset();
    expect(scene.getTransportState().isPlaying).toBe(false);
    syncUrl();
    await vi.advanceTimersByTimeAsync(200);
    const next = new URL(window.location.href).searchParams;
    expect(next.get('autoRun')).toBe('0');
    expect(next.get('mass')).toBe('2');
    scene.dispose();
  });

  it('applies transport timeScale to step', () => {
    const scene = createVariableWorkScene();
    scene.setTimeScale(0.25);
    expect(scene.getTimeScale()).toBe(0.25);
    scene.startAll();
    scene.step(0.4);
    expect(scene.getState().time).toBeCloseTo(0.1, 6);
    expect(scene.getState().finished).toBe(false);
    scene.dispose();
  });
});
