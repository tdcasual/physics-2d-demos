/**
 * A3 冻结批：编码 round-trip、③ remount/reset spy=0、②③ syncFromScene 静默。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncControlsFromLiveParams } from '../../src/app/control-projection';
import { createCentripetalScene } from '../../src/scenes/centripetal-motion/scene.entry';
import { createChargedParticleScene } from '../../src/scenes/charged-particle-circle/scene.entry';
import { createEmfInternalScene } from '../../src/scenes/emf-internal-resistance/scene.entry';
import { createInternalEnergyScene } from '../../src/scenes/internal-energy/scene.entry';
import { createMechanicalEnergyScene } from '../../src/scenes/mechanical-energy/scene.entry';
import { createPrecisionToolScene } from '../../src/scenes/precision-tools/scene.entry';
import { createProjectileComponentsScene } from '../../src/scenes/projectile-components/scene.entry';
import { createResistorScene } from '../../src/scenes/resistor-measurement/scene.entry';
import { createSpringBallScene } from '../../src/scenes/spring-ball/scene.entry';
import { createVariableWorkScene } from '../../src/scenes/variable-work/scene.entry';
import { createTickerTapeScene } from '../../src/scenes/ticker-tape/scene.entry';
import { createVtIntegralScene } from '../../src/scenes/vt-integral/scene.entry';
import {
  decodeTickerTapeControls,
  TICKER_TAPE_NOISE_IDS
} from '../../src/scenes/ticker-tape/page';
import { decodeVtSceneSelectorId } from '../../src/scenes/vt-integral/page';
import { getTrialField } from '../../src/platform/data-workspace';
import * as tickerTapeDataTask from '../../src/scenes/ticker-tape/data-task';

const captured = vi.hoisted(() => ({
  byId: new Map<
    string,
    (opts: {
      mount: HTMLElement;
      scene: unknown;
      writeParam?: (key: string, value: number | string | boolean) => void;
      scheduleRender?: () => void;
    }) => {
      syncFromScene?: () => void;
      dispose: () => void;
      fieldTypes?: Map<string, string>;
      setValueSilently?: (key: string, value: unknown) => void;
      setActiveSilently?: (key: string, id: string) => void;
    }
  >()
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (opts: {
    meta: { id: string };
    createControls: (o: {
      mount: HTMLElement;
      scene: unknown;
      writeParam?: (key: string, value: number | string | boolean) => void;
      scheduleRender?: () => void;
    }) => {
      syncFromScene?: () => void;
      dispose: () => void;
    };
  }) => {
    captured.byId.set(opts.meta.id, opts.createControls);
  }
}));

import '../../src/scenes/centripetal-motion/page';
import '../../src/scenes/charged-particle-circle/page';
import '../../src/scenes/emf-internal-resistance/page';
import '../../src/scenes/internal-energy/page';
import '../../src/scenes/mechanical-energy/page';
import '../../src/scenes/precision-tools/page';
import '../../src/scenes/projectile-components/page';
import '../../src/scenes/resistor-measurement/page';
import '../../src/scenes/spring-ball/page';
import '../../src/scenes/ticker-tape/page';
import '../../src/scenes/variable-work/page';
import '../../src/scenes/vt-integral/page';

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
  writeParam = vi.fn()
): {
  mount: HTMLElement;
  handle: Handle;
  writeParam: ReturnType<typeof vi.fn>;
} {
  const createControls = captured.byId.get(id);
  if (!createControls) throw new Error(`createControls missing for ${id}`);
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const handle = createControls({
    mount,
    scene,
    writeParam,
    scheduleRender: vi.fn()
  });
  pendingDispose.push(() => {
    handle.dispose();
    mount.remove();
  });
  return { mount, handle, writeParam };
}

function recordDomEvents(mount: HTMLElement): { events: string[] } {
  const events: string[] = [];
  mount.addEventListener('input', () => events.push('input'), true);
  mount.addEventListener('change', () => events.push('change'), true);
  return { events };
}

function sliderValue(mount: HTMLElement, key: string): string {
  const input = mount.querySelector(
    `[data-control-key="${key}"] input`
  ) as HTMLInputElement | null;
  return input?.value ?? '';
}

function toggleChecked(mount: HTMLElement, key: string): string {
  const btn = mount.querySelector(
    `[data-control-key="${key}"] button[role="switch"]`
  );
  return btn?.getAttribute('aria-checked') ?? '';
}

function activePreset(mount: HTMLElement, key: string): string {
  const btn = mount.querySelector(
    `[data-control-key="${key}"] button[aria-checked="true"]`
  ) as HTMLElement | null;
  return btn?.dataset.presetId ?? '';
}

function activeSelector(mount: HTMLElement, key: string): string {
  const btn = mount.querySelector(
    `[data-control-key="${key}"] button[aria-checked="true"]`
  );
  return btn?.textContent ?? '';
}

function selectValue(mount: HTMLElement, key: string): string {
  const select = mount.querySelector(
    `[data-control-key="${key}"] select`
  ) as HTMLSelectElement | null;
  return select?.value ?? '';
}

describe('ticker-tape encoding round-trip', () => {
  it('decodes countEvery / noise / showA / vSigFigs from getParams encoding', () => {
    expect(
      decodeTickerTapeControls({
        countEvery: 1,
        noise: 0,
        showA: 0,
        vSigFigs: 3,
        preset: 'ua'
      })
    ).toEqual({
      countEvery: false,
      noise: 'off',
      showA: false,
      vSigFigs: '3',
      preset: 'ua'
    });
    expect(
      decodeTickerTapeControls({
        countEvery: 5,
        noise: 1,
        showA: 1,
        vSigFigs: 4,
        preset: 'ud'
      })
    ).toEqual({
      countEvery: true,
      noise: 'typical',
      showA: true,
      vSigFigs: '4',
      preset: 'ud'
    });
    expect(TICKER_TAPE_NOISE_IDS[2]).toBe('large');
    expect(
      decodeTickerTapeControls({
        countEvery: 5,
        noise: 2,
        showA: 1,
        vSigFigs: 2,
        preset: 'variable'
      }).noise
    ).toBe('large');
  });

  it('syncFromScene paints decoded values without scene writes', () => {
    const scene = createTickerTapeScene();
    scene.setParams({
      countEvery: 5,
      noise: 'typical',
      showA: true,
      vSigFigs: 3
    });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('ticker-tape', scene);
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(toggleChecked(mount, 'countEvery')).toBe('true');
    expect(activePreset(mount, 'noise')).toBe('typical');
    expect(toggleChecked(mount, 'showA')).toBe('true');
    expect(selectValue(mount, 'vSigFigs')).toBe('3');
  });

  it('remount projection does not invalidate workspace session', async () => {
    const invalidateAll = vi.fn();
    const origCreate = tickerTapeDataTask.createTickerTapeDataWorkspace;
    vi.spyOn(
      tickerTapeDataTask,
      'createTickerTapeDataWorkspace'
    ).mockImplementation((opts) => {
      const inner = origCreate(opts);
      const origInvalidate = inner.invalidateAll.bind(inner);
      inner.invalidateAll = (reason: string) => {
        invalidateAll(reason);
        origInvalidate(reason);
      };
      return inner;
    });

    const scene = createTickerTapeScene();
    pendingDispose.push(() => scene.dispose());
    const host = scene.getDataWorkspace();
    await vi.waitFor(() => {
      expect(() => host.getSpec()).not.toThrow();
    });

    scene.setParams({
      preset: 'ud',
      noise: 'typical',
      countEvery: 5,
      showA: true,
      vSigFigs: 3
    });
    expect(invalidateAll).toHaveBeenCalled();
    invalidateAll.mockClear();

    const tapeX = scene.getState().tapeXCm;
    const submitted = host.submitField({
      field: 'x',
      trialIndex: 0,
      raw: tapeX[0].toFixed(2)
    });
    expect(submitted.feedback.ok).toBe(true);
    const before = getTrialField(host.getSession().trials[0], 'x');
    expect(before?.checked).toBe(true);
    expect(before?.stale).toBe(false);
    expect(before?.raw).toBe(tapeX[0].toFixed(2));
    invalidateAll.mockClear();

    mountScene('ticker-tape', scene);
    const second = mountScene('ticker-tape', scene);
    second.handle.syncFromScene?.();

    expect(invalidateAll).not.toHaveBeenCalled();
    const after = getTrialField(host.getSession().trials[0], 'x');
    expect(after?.checked).toBe(true);
    expect(after?.stale).toBe(false);
    expect(after?.raw).toBe(before?.raw);
  });
});

describe('vt-integral index → id decode', () => {
  it('uses 1-based getParams.scene (scene1→1, scene2→2, scene3→3)', () => {
    expect(decodeVtSceneSelectorId(1)).toBe('scene1');
    expect(decodeVtSceneSelectorId(2)).toBe('scene2');
    expect(decodeVtSceneSelectorId(3)).toBe('scene3');
    expect(decodeVtSceneSelectorId('scene2')).toBe('scene2');
  });

  it('syncFromScene highlights scene2 when getParams.scene is 2', () => {
    const scene = createVtIntegralScene();
    scene.setParams({ scene: 2, n: 24 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('vt-integral', scene);
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(activeSelector(mount, 'scene')).toContain('化曲为直');
    expect(sliderValue(mount, 'n')).toBe('24');
  });
});

const CLASS3 = [
  {
    id: 'centripetal-motion',
    create: () => {
      const scene = createCentripetalScene();
      scene.setParams({ mass: 4, radius: 3, angularVelocity: 2.5 });
      return scene;
    },
    assert: (mount: HTMLElement) => {
      expect(sliderValue(mount, 'mass')).toBe('4');
      expect(sliderValue(mount, 'radius')).toBe('3');
      expect(sliderValue(mount, 'angularVelocity')).toBe('2.5');
    }
  },
  {
    id: 'resistor-measurement',
    create: () => {
      const scene = createResistorScene();
      scene.setParams({
        circuitMode: 'limiting',
        targetResistance: 40
      });
      return scene;
    },
    assert: (mount: HTMLElement) => {
      expect(activePreset(mount, 'circuitMode')).toBe('limiting');
      expect(sliderValue(mount, 'targetResistance')).toBe('40');
    }
  },
  {
    id: 'precision-tools',
    create: () => {
      const scene = createPrecisionToolScene();
      scene.setParams({ mode: 'caliper20', adjustment: 0.72 });
      return scene;
    },
    assert: (mount: HTMLElement) => {
      expect(activePreset(mount, 'mode')).toBe('caliper20');
      expect(sliderValue(mount, 'adjustment')).toBe('0.72');
    }
  },
  {
    id: 'charged-particle-circle',
    create: () => {
      const scene = createChargedParticleScene();
      scene.setParams({ mass: 7, velocity: 55, fieldDirection: 'out' });
      return scene;
    },
    assert: (mount: HTMLElement) => {
      expect(sliderValue(mount, 'mass')).toBe('7');
      expect(sliderValue(mount, 'velocity')).toBe('55');
      expect(activePreset(mount, 'fieldDirection')).toBe('out');
    }
  },
  {
    id: 'spring-ball',
    create: () => {
      const scene = createSpringBallScene();
      scene.setParams({ preset: 'h-2x0', mode: 'continuous' });
      return scene;
    },
    assert: (mount: HTMLElement) => {
      expect(activePreset(mount, 'preset')).toBe('h-2x0');
      expect(activePreset(mount, 'mode')).toBe('continuous');
    }
  }
] as const;

describe('③ remount/reset projection does not call setParams/writeParam', () => {
  for (const spec of CLASS3) {
    it(`${spec.id} remount syncFromScene is write-free`, () => {
      const scene = spec.create();
      const setParams = vi.spyOn(scene, 'setParams');
      const { mount, handle, writeParam } = mountScene(spec.id, scene);
      const { events } = recordDomEvents(mount);
      handle.syncFromScene?.();
      expect(setParams).not.toHaveBeenCalled();
      expect(writeParam).not.toHaveBeenCalled();
      expect(events).toEqual([]);
      spec.assert(mount);
    });

    it(`${spec.id} reset then syncFromScene is write-free`, () => {
      const scene = spec.create();
      scene.reset();
      const setParams = vi.spyOn(scene, 'setParams');
      const { handle, writeParam } = mountScene(spec.id, scene);
      setParams.mockClear();
      writeParam.mockClear();
      handle.syncFromScene?.();
      expect(setParams).not.toHaveBeenCalled();
      expect(writeParam).not.toHaveBeenCalled();
    });
  }
});

describe('②③ syncFromScene is silent (no input/change)', () => {
  it('mechanical-energy', () => {
    const scene = createMechanicalEnergyScene();
    scene.setParams({ mass: 1.5, environment: 'ideal' });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene(
      'mechanical-energy',
      scene
    );
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(sliderValue(mount, 'mass')).toBe('1.5');
    expect(activePreset(mount, 'environment')).toBe('ideal');
  });

  it('internal-energy', () => {
    const scene = createInternalEnergyScene();
    scene.setParams({ mode: 'heat', tHot: 80 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('internal-energy', scene);
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(activePreset(mount, 'mode')).toBe('heat');
    expect(sliderValue(mount, 'tHot')).toBe('80');
  });

  it('variable-work', () => {
    const scene = createVariableWorkScene();
    scene.setParams({ mode: 'power', mass: 3 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene('variable-work', scene);
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(activePreset(mount, 'mode')).toBe('power');
    expect(sliderValue(mount, 'mass')).toBe('3');
  });

  it('emf-internal-resistance keeps non-schema DOM in sync silently', () => {
    const scene = createEmfInternalScene();
    const { mount, handle, writeParam } = mountScene(
      'emf-internal-resistance',
      scene
    );
    scene.setParams({ rheostatResistance: 12, sourceVoltage: 3 });
    const setParams = vi.spyOn(scene, 'setParams');
    writeParam.mockClear();
    const { events } = recordDomEvents(mount);
    handle.syncFromScene?.();
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(sliderValue(mount, 'rheostatResistance')).toBe('12');
    expect(selectValue(mount, 'sourceVoltage')).toBe('3');
  });

  it('projectile-components uses generic silent projection (no custom syncFromScene)', () => {
    const scene = createProjectileComponentsScene();
    scene.setParams({ speed: 22, initialHeight: 30 });
    const setParams = vi.spyOn(scene, 'setParams');
    const { mount, handle, writeParam } = mountScene(
      'projectile-components',
      scene
    );
    expect(handle.syncFromScene).toBeUndefined();
    const { events } = recordDomEvents(mount);
    syncControlsFromLiveParams({
      params: scene.getParams(),
      handle
    });
    expect(setParams).not.toHaveBeenCalled();
    expect(writeParam).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(sliderValue(mount, 'speed')).toBe('22');
    expect(sliderValue(mount, 'initialHeight')).toBe('30');
  });
});
