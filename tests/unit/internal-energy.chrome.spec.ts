import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoProfile } from '../../src/app/layouts/capabilities/demo-profile';
import type { CapabilityContext } from '../../src/app/layouts/types';
import {
  filterPresentationReadout,
  SceneAdapter
} from '../../src/app/scene-adapter';
import { writeSceneParams } from '../../src/app/url-sync';
import {
  resolveDemoProfile,
  TASK_MASTERS
} from '../../src/platform/demo-profile';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import { internalEnergyControlsSchema } from '../../src/scenes/internal-energy/controls-schema';
import { createInternalEnergyScene } from '../../src/scenes/internal-energy/scene.entry';
import { internalEnergyMeta } from '../../src/scenes/internal-energy/scene.meta';
import {
  gasApparatusLayout,
  stageField
} from '../../src/scenes/internal-energy/scene.view';
import {
  overlayControlKeys,
  restoredUrlParams,
  shouldShowExpand,
  shouldShowHeat,
  shouldShowRatio
} from '../../src/scenes/internal-energy/scene.sim';

describe('internal-energy chrome', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no duplicate autoRun transport toggle or reset button', () => {
    const keys = internalEnergyControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('autoRun');
    expect(keys).not.toContain('reset');
    expect(keys).toContain('mode');
    expect(keys).toContain('ratio');
  });

  it('shows gas sliders in compress/expand and heat sliders in heat', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const renderer = renderSchema({
      mount,
      schema: internalEnergyControlsSchema,
      onChange: () => undefined,
      onAction: () => undefined
    });
    renderer.setVisible('ratio', shouldShowRatio('compress'));
    renderer.setVisible('dewPoint', shouldShowExpand('compress'));
    renderer.setVisible('tHot', shouldShowHeat('compress'));
    const ratio = mount.querySelector(
      '[data-control-key="ratio"]'
    ) as HTMLElement;
    const dew = mount.querySelector(
      '[data-control-key="dewPoint"]'
    ) as HTMLElement;
    const hot = mount.querySelector('[data-control-key="tHot"]') as HTMLElement;
    expect(ratio.style.display).not.toBe('none');
    expect(dew.style.display).toBe('none');
    expect(hot.style.display).toBe('none');
    renderer.setVisible('ratio', shouldShowRatio('expand'));
    renderer.setVisible('dewPoint', shouldShowExpand('expand'));
    renderer.setVisible('wet', shouldShowExpand('expand'));
    expect(dew.style.display).not.toBe('none');
    renderer.setVisible('ratio', shouldShowRatio('heat'));
    renderer.setVisible('dewPoint', shouldShowExpand('heat'));
    renderer.setVisible('tHot', shouldShowHeat('heat'));
    expect(ratio.style.display).toBe('none');
    expect(hot.style.display).not.toBe('none');
    renderer.dispose();
    mount.remove();
  });

  it('applies URL mode=2 to the heat preset', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const scene = createInternalEnergyScene();
    const renderer = renderSchema({
      mount,
      schema: internalEnergyControlsSchema,
      onChange: () => undefined,
      onAction: () => undefined
    });
    scene.setParams({ mode: 'heat', tHot: 90, cHot: 150 });
    renderer.setActive('mode', 'heat');
    renderer.setVisible('ratio', false);
    renderer.setVisible('tHot', true);
    expect(scene.getParams().mode).toBe('heat');
    const ratio = mount.querySelector(
      '[data-control-key="ratio"]'
    ) as HTMLElement;
    const hot = mount.querySelector('[data-control-key="tHot"]') as HTMLElement;
    expect(ratio.style.display).toBe('none');
    expect(hot.style.display).not.toBe('none');
    renderer.dispose();
    scene.dispose();
    mount.remove();
  });

  it('writes autoRun=1/0 into the URL on start, pause, and reset', async () => {
    vi.useFakeTimers();
    window.history.replaceState(
      {},
      '',
      '/src/pages/internal-energy.html?autoRun=1&ratio=2'
    );
    const scene = createInternalEnergyScene();
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
    expect(next.get('ratio')).toBe('3');
    scene.dispose();
  });

  it('applies transport timeScale to step', () => {
    const scene = createInternalEnergyScene();
    scene.setTimeScale(0.25);
    expect(scene.getTimeScale()).toBe(0.25);
    scene.startAll();
    scene.step(0.4);
    expect(scene.getState().time).toBeCloseTo(0.1, 6);
    expect(scene.getState().finished).toBe(false);
    scene.dispose();
  });

  it('labels swapped heat bodies as left/right, not hot/cold', () => {
    const scene = createInternalEnergyScene();
    scene.setParams({
      mode: 'heat',
      tHot: 20,
      tCold: 80,
      cHot: 100,
      cCold: 300
    });
    const items = scene.getReadoutItems();
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.tHot.label).toBe('T左');
    expect(byKey.tCold.label).toBe('T右');
    expect(byKey.tHot.value).toContain('20.0');
    expect(byKey.tCold.value).toContain('80.0');
    expect(byKey.heatHot.label).toBe('Q左');
    expect(byKey.heatCold.label).toBe('Q右');
    expect(byKey.heatSum.label).toBe('Q合');
    expect(byKey.tEq.label).toBe('Teq');
    expect(items.map((item) => item.label)).toEqual([
      'T左',
      'T右',
      'Teq',
      'W',
      'Q左',
      'Q右',
      'Q合'
    ]);
    expect(
      items.every((item) => !/高温|低温|T热|T冷|Q热|Q冷/.test(item.label))
    ).toBe(true);
    scene.dispose();
  });

  it('overrides process docked-bottom with an independent overlay readout', () => {
    expect(TASK_MASTERS.process.readoutPanel).toBe('docked-bottom');
    expect(internalEnergyMeta.demoProfile?.readoutPanel).toBe('overlay');
    const resolved = resolveDemoProfile(internalEnergyMeta.demoProfile!, {
      sceneId: 'internal-energy'
    });
    expect(resolved.lessonTask).toBe('process');
    expect(resolved.readoutPanel).toBe('overlay');
    expect(resolved.graphPanel).toBe('visible');
    expect(resolved.transport).toBe('visible');
    expect(resolved.visibleControlKeys).toEqual(['mode']);
    expect(overlayControlKeys('heat')).toEqual([
      'mode',
      'tHot',
      'tCold',
      'cHot',
      'cCold'
    ]);
    expect(overlayControlKeys('heat')).not.toContain('ratio');
    expect(overlayControlKeys('heat')).not.toContain('dewPoint');
    expect(overlayControlKeys('heat')).not.toContain('wet');
    expect(overlayControlKeys('compress')).toEqual(['mode', 'ratio']);
    expect(overlayControlKeys('expand')).toEqual([
      'mode',
      'ratio',
      'dewPoint',
      'wet'
    ]);
    const adapter = new SceneAdapter({
      meta: internalEnergyMeta,
      demoProfile: internalEnergyMeta.demoProfile,
      createScene: () => createInternalEnergyScene()
    });
    expect(adapter.getDemoProfile()?.readoutPanel).toBe('overlay');
  });

  it('applies is-overlay on the desktop readout panel for this scene', () => {
    const container = document.createElement('div');
    const panel = document.createElement('div');
    panel.className = 'srgb-readout-panel readout-panel is-collapsed';
    container.appendChild(panel);
    const ctx: CapabilityContext = {
      container,
      getTheme: () => 'light',
      setTheme: () => undefined,
      getMode: () => 'presentation',
      setMode: () => undefined,
      switchLayout: () => undefined,
      getCurrentLayoutId: () => 'split-right-graph-bottom',
      getAvailableLayouts: () => [],
      on: () => () => undefined,
      requestStageRepaint: () => undefined
    };
    const instance = createDemoProfile().mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );
    const profile = resolveDemoProfile(internalEnergyMeta.demoProfile!, {
      sceneId: 'internal-energy'
    });
    instance.update?.({ mode: 'presentation', profile });
    expect(panel.classList.contains('srgb-is-overlay')).toBe(true);
    expect(panel.classList.contains('srgb-readout-enlarged')).toBe(true);
    expect(panel.classList.contains('srgb-is-docked-bottom')).toBe(false);
    expect(panel.classList.contains('is-collapsed')).toBe(false);
    instance.dispose();
  });

  it('places the overlay readout left edge to the right of the apparatus', () => {
    const width = 1280;
    const height = 403;
    const field = stageField(width, height, 1.02, true);
    const compress = gasApparatusLayout(
      width,
      height,
      1.02,
      80,
      'compress',
      true
    );
    const expand = gasApparatusLayout(width, height, 1.02, 160, 'expand', true);
    const overlayLeft = width - field.overlayReserve;
    expect(field.overlayReserve).toBeGreaterThan(300);
    expect(field.bottomClear).toBeCloseTo(field.pad);
    expect(compress.gasRight).toBeLessThan(overlayLeft);
    expect(expand.gasRight).toBeLessThan(overlayLeft);
    expect(overlayLeft).toBeGreaterThan(compress.gasRight);
    const panel = document.createElement('div');
    panel.className = 'srgb-readout-panel srgb-is-overlay readout-panel';
    panel.getBoundingClientRect = () =>
      ({
        left: overlayLeft,
        right: width - field.pad,
        top: 129,
        bottom: 450,
        width: field.overlayReserve - field.pad,
        height: 321,
        x: overlayLeft,
        y: 129,
        toJSON() {
          return {};
        }
      }) as DOMRect;
    expect(panel.getBoundingClientRect().left).toBeGreaterThan(
      compress.gasRight
    );
    expect(panel.getBoundingClientRect().left).toBeGreaterThan(expand.gasRight);
  });

  it('keeps all three-mode readout keys after filterPresentationReadout', () => {
    const resolved = resolveDemoProfile(internalEnergyMeta.demoProfile!, {
      sceneId: 'internal-energy'
    });
    const scene = createInternalEnergyScene();

    scene.setParams({ mode: 'compress', ratio: 3 });
    const compress = scene.getReadoutItems();
    expect(compress.map((item) => item.label)).toEqual([
      'T',
      'p',
      'V',
      'W',
      'Q',
      'ΔU',
      '现象'
    ]);
    expect(compress.map((item) => item.key)).toEqual([
      'temperature',
      'pressure',
      'volume',
      'work',
      'heat',
      'deltaU',
      'phenomenon'
    ]);
    expect(
      filterPresentationReadout(compress, 'presentation', resolved)
    ).toEqual(compress);

    scene.setParams({ mode: 'expand', ratio: 2, wet: true });
    scene.startAll();
    scene.step(3);
    const expand = scene.getReadoutItems();
    expect(expand.map((item) => item.key)).toEqual([
      'temperature',
      'pressure',
      'volume',
      'work',
      'heat',
      'deltaU',
      'phenomenon'
    ]);
    expect(expand.find((item) => item.key === 'phenomenon')?.value).toBe(
      '凝结雾'
    );
    expect(filterPresentationReadout(expand, 'presentation', resolved)).toEqual(
      expand
    );

    scene.setParams({ mode: 'heat', tHot: 80, tCold: 20 });
    const heat = scene.getReadoutItems();
    expect(heat.map((item) => item.label)).toEqual([
      'T左',
      'T右',
      'Teq',
      'W',
      'Q左',
      'Q右',
      'Q合'
    ]);
    expect(heat.map((item) => item.key)).toEqual([
      'tHot',
      'tCold',
      'tEq',
      'work',
      'heatHot',
      'heatCold',
      'heatSum'
    ]);
    expect(filterPresentationReadout(heat, 'presentation', resolved)).toEqual(
      heat
    );
    scene.dispose();
  });
});
