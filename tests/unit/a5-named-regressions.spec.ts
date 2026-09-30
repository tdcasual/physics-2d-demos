/**
 * A5 具名回归：chase-meet remount、double-slit step=6 remount、
 * projectile paramMap 反查、reset 路径、双向 remount。
 *
 * A5.2/A5.5/A5.6/A5.7-③ spy=0 已由 freeze-batch-silent-projection 与
 * url-first-paint-side-effects 覆盖，这里不重复。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  paramsFromScene,
  syncControlsFromLiveParams
} from '../../src/app/control-projection';
import { SceneAdapter } from '../../src/app/scene-adapter';
import type { LayoutSlots } from '../../src/app/layouts/types';
import type { SceneParamSync } from '../../src/app/scene-bootstrapper-types';
import { createChaseMeetScene } from '../../src/scenes/chase-meet/scene.entry';
import { createDoubleSlitScene } from '../../src/scenes/double-slit/scene.entry';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';
import { createCentripetalScene } from '../../src/scenes/centripetal-motion/scene.entry';
import { centripetalMeta } from '../../src/scenes/centripetal-motion/scene.meta';
import { createMechanicalEnergyScene } from '../../src/scenes/mechanical-energy/scene.entry';
import { createElectrificationScene } from '../../src/scenes/electrification/scene.entry';

const captured = vi.hoisted(() => ({
  byId: new Map<
    string,
    (opts: {
      mount: HTMLElement;
      scene: unknown;
      writeParam?: (key: string, value: number | string | boolean) => void;
      scheduleRender?: () => void;
      urlParams?: Record<string, number | string>;
    }) => Handle
  >(),
  paramSync: new Map<string, SceneParamSync | undefined>()
}));

vi.mock('../../src/app/scene-bootstrapper', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/app/scene-bootstrapper')>();
  return {
    ...actual,
    bootScenePage: (opts: {
      meta: { id: string };
      paramSync?: SceneParamSync;
      createControls: (o: {
        mount: HTMLElement;
        scene: unknown;
        writeParam?: (key: string, value: number | string | boolean) => void;
        scheduleRender?: () => void;
        urlParams?: Record<string, number | string>;
      }) => Handle;
    }) => {
      captured.byId.set(opts.meta.id, opts.createControls);
      captured.paramSync.set(opts.meta.id, opts.paramSync);
    }
  };
});

import '../../src/scenes/chase-meet/page';
import '../../src/scenes/double-slit/page';
import '../../src/scenes/projectile/page';
import '../../src/scenes/centripetal-motion/page';
import '../../src/scenes/mechanical-energy/page';
import '../../src/scenes/electrification/page';

type Handle = {
  syncFromScene?: () => void;
  dispose: () => void;
  fieldTypes?: Map<string, string>;
  setValueSilently?: (key: string, value: unknown) => void;
  setActiveSilently?: (key: string, id: string) => void;
};

const pendingDispose: Array<() => void> = [];

afterEach(() => {
  while (pendingDispose.length > 0) {
    pendingDispose.pop()?.();
  }
});

function mountScene(
  id: string,
  scene: unknown,
  urlParams: Record<string, number | string> = {}
): {
  mount: HTMLElement;
  handle: Handle;
  writeParam: ReturnType<typeof vi.fn>;
} {
  const createControls = captured.byId.get(id);
  if (!createControls) throw new Error(`createControls missing for ${id}`);
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const writeParam = vi.fn();
  const handle = createControls({
    mount,
    scene,
    writeParam,
    scheduleRender: vi.fn(),
    urlParams
  });
  pendingDispose.push(() => {
    handle.dispose();
    mount.remove();
  });
  return { mount, handle, writeParam };
}

function remountProject(id: string, scene: unknown, handle: Handle): void {
  syncControlsFromLiveParams({
    params: paramsFromScene(scene as { getParams?(): object }),
    handle,
    paramSync: captured.paramSync.get(id)
  });
}

function controlInput(
  mount: HTMLElement,
  key: string
): HTMLInputElement | null {
  return mount.querySelector(
    `[data-control-key="${key}"] input`
  ) as HTMLInputElement | null;
}

function controlValue(mount: HTMLElement, key: string): string {
  return controlInput(mount, key)?.value ?? '';
}

describe('A5.1 chase-meet remount projects live expression and numbers', () => {
  it('text box shows live vExprA and sliders show live values after remount', () => {
    const scene = createChaseMeetScene();
    scene.setParams({ vExprA: '0.5*t', x0A: 3, x0B: 12 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('chase-meet', scene);
    remountProject('chase-meet', scene, handle);
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(controlValue(mount, 'vExprA')).toBe('0.5*t');
    expect(controlValue(mount, 'x0A')).toBe('3');
    expect(controlValue(mount, 'x0B')).toBe('12');
    scene.dispose();
  });
});

describe('A5.3 double-slit ?step=6 remount keeps step6 schema write-free', () => {
  it('empty-url remount builds step6 schema and does not call setParams', () => {
    const scene = createDoubleSlitScene();
    scene.setParams({ step: 6 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('double-slit', scene, {});
    expect(
      mount.querySelector('[data-control-key="stripeOffset"]')
    ).not.toBeNull();
    expect(
      mount.querySelector('[data-control-key="activeInstrument"]')
    ).not.toBeNull();
    expect(
      mount.querySelector('[data-control-key="crosshairAngle"]')
    ).not.toBeNull();
    setParams.mockClear();
    writeParam.mockClear();
    remountProject('double-slit', scene, handle);
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    scene.dispose();
  });
});

describe('A5.4 projectile paramMap reverse lookup', () => {
  it('v0 control shows live speed after remount', () => {
    const scene = createProjectileScene();
    scene.setParams({ speed: 42 });
    const { mount, handle } = mountScene('projectile', scene);
    remountProject('projectile', scene, handle);
    expect(controlValue(mount, 'v0')).toBe('42');
    scene.dispose();
  });
});

describe('A5.7 reset path projects reset values', () => {
  it('② mechanical-energy: reset then project shows default mass', () => {
    const scene = createMechanicalEnergyScene();
    scene.setParams({ mass: 1.5, environment: 'ideal' });
    const { mount, handle } = mountScene('mechanical-energy', scene);
    remountProject('mechanical-energy', scene, handle);
    expect(controlValue(mount, 'mass')).toBe('1.5');
    scene.reset();
    remountProject('mechanical-energy', scene, handle);
    expect(controlValue(mount, 'mass')).toBe('1');
    const env = mount.querySelector(
      '[data-control-key="environment"] button[aria-checked="true"]'
    ) as HTMLElement | null;
    expect(env?.dataset.presetId).toBe('resist');
    scene.dispose();
  });

  it('③ centripetal-motion: adapter.reset and keyboard r project defaults', () => {
    const scene = createCentripetalScene();
    const createControls = captured.byId.get('centripetal-motion');
    if (!createControls) throw new Error('centripetal-motion controls missing');
    let handle: Handle | undefined;
    const adapter = new SceneAdapter({
      meta: centripetalMeta,
      createScene: () => scene,
      createControls: ({ mount, scene: live }) => {
        handle = createControls({
          mount,
          scene: live,
          writeParam: vi.fn(),
          scheduleRender: vi.fn()
        });
        return handle;
      }
    });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);
    const controls = document.createElement('div');
    document.body.appendChild(controls);
    pendingDispose.push(() => {
      adapter.unmount();
      controls.remove();
      scene.dispose();
    });
    adapter.renderAnimation(container, {
      animation: container,
      control: controls
    } as LayoutSlots);
    adapter.renderControl(controls);
    if (!handle) throw new Error('centripetal-motion handle missing');

    // schema 默认恰等于 sim 默认（2 / 2.5 / 1.5）。先把非默认值投进
    // 面板，删掉 SceneAdapter.reset 的投影接线后本断言必红。
    scene.setParams({ mass: 4, radius: 3, angularVelocity: 2.5 });
    remountProject('centripetal-motion', scene, handle);
    expect(controlValue(controls, 'mass')).toBe('4');
    expect(controlValue(controls, 'radius')).toBe('3');
    expect(controlValue(controls, 'angularVelocity')).toBe('2.5');
    adapter.reset();
    expect(controlValue(controls, 'mass')).toBe('2');
    expect(controlValue(controls, 'radius')).toBe('2.5');
    expect(controlValue(controls, 'angularVelocity')).toBe('1.5');

    scene.setParams({ mass: 4, radius: 3, angularVelocity: 2.5 });
    remountProject('centripetal-motion', scene, handle);
    expect(controlValue(controls, 'mass')).toBe('4');
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'r',
        bubbles: true,
        cancelable: true
      })
    );
    expect(controlValue(controls, 'mass')).toBe('2');
    expect(controlValue(controls, 'radius')).toBe('2.5');
    expect(controlValue(controls, 'angularVelocity')).toBe('1.5');
  });
});

describe('A5 electrification remount highlights live scene', () => {
  it('scene-selector follows getParams.scene via setActiveSilently', () => {
    const scene = createElectrificationScene();
    scene.setScene('induction');
    const setScene = vi.spyOn(scene, 'setScene');
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('electrification', scene);
    remountProject('electrification', scene, handle);
    expect(setScene).not.toHaveBeenCalled();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    const active = mount.querySelector(
      '[data-control-key="scene"] button[aria-checked="true"] span'
    );
    expect(active?.textContent).toBe('感应起电');
    scene.dispose();
  });
});

describe('A5.8 bidirectional remount A→B→A', () => {
  it('chase-meet projects each generation of live params', () => {
    const scene = createChaseMeetScene();
    scene.setParams({ vExprA: '0.5*t', x0A: 3 });
    const first = mountScene('chase-meet', scene);
    remountProject('chase-meet', scene, first.handle);
    expect(controlValue(first.mount, 'vExprA')).toBe('0.5*t');
    expect(controlValue(first.mount, 'x0A')).toBe('3');
    first.handle.dispose();
    first.mount.remove();

    scene.setParams({ vExprA: '3', x0A: 7 });
    const second = mountScene('chase-meet', scene);
    remountProject('chase-meet', scene, second.handle);
    expect(controlValue(second.mount, 'vExprA')).toBe('3');
    expect(controlValue(second.mount, 'x0A')).toBe('7');
    scene.dispose();
  });
});
