/**
 * A4.1 / A5.5：URL 首绘走静默 setter 后，handle 副作用仍须生效。
 *
 * - faraday-disc / interference-formula / thin-film / wedge：静默路径对等
 *   setValue 上的 syncPreset / updateLambdaSliderColor
 * - dynamic-circle / force-composition：tab/boundary 首绘可见性靠 scene
 *   subscribe→notify 补偿（不改实现，用测试固化）
 */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  applySceneUrlParams,
  createSceneParamWriter,
  resetUrlSyncOwners,
  resolveUrlSyncKeys
} from '../../src/app/url-sync';
import { wavelengthToColor } from '../../src/core/wavelength';
import type {
  SceneInstance,
  SceneParamWriter
} from '../../src/app/scene-bootstrapper-types';
import type { SceneMeta } from '../../src/platform/scene-contract';
import { createFaradayScene } from '../../src/scenes/faraday-disc/scene.entry';
import { faradayMeta } from '../../src/scenes/faraday-disc/scene.meta';
import { createInterferenceFormulaScene } from '../../src/scenes/interference-formula/scene.entry';
import { interferenceFormulaMeta } from '../../src/scenes/interference-formula/scene.meta';
import { createThinFilmScene } from '../../src/scenes/thin-film/scene.entry';
import { thinFilmMeta } from '../../src/scenes/thin-film/scene.meta';
import { createWedgeScene } from '../../src/scenes/wedge/scene.entry';
import { wedgeMeta } from '../../src/scenes/wedge/scene.meta';
import { createDynamicCircleScene } from '../../src/scenes/dynamic-circle/scene.entry';
import { dynamicCircleMeta } from '../../src/scenes/dynamic-circle/scene.meta';
import { createForceCompositionScene } from '../../src/scenes/force-composition/scene.entry';
import { forceCompositionMeta } from '../../src/scenes/force-composition/scene.meta';

const captured = vi.hoisted(() => ({
  byId: new Map<
    string,
    (opts: {
      mount: HTMLElement;
      scene: unknown;
      writeParam?: (key: string, value: number | string | boolean) => void;
      scheduleRender?: () => void;
      sceneWriter?: SceneParamWriter;
    }) => Handle
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
      sceneWriter?: SceneParamWriter;
    }) => Handle;
  }) => {
    captured.byId.set(opts.meta.id, opts.createControls);
  }
}));

import '../../src/scenes/faraday-disc/page';
import '../../src/scenes/interference-formula/page';
import '../../src/scenes/thin-film/page';
import '../../src/scenes/wedge/page';
import '../../src/scenes/dynamic-circle/page';
import '../../src/scenes/force-composition/page';

type Handle = {
  setValue?: (key: string, value: number | string | boolean) => void;
  setValueSilently?: (key: string, value: number | string | boolean) => void;
  setActive?: (key: string, value: string) => void;
  setActiveSilently?: (key: string, value: string) => void;
  dispose: () => void;
};

const pendingDispose: Array<() => void> = [];

afterEach(() => {
  while (pendingDispose.length > 0) {
    pendingDispose.pop()?.();
  }
  resetUrlSyncOwners();
  window.history.replaceState({}, '', '/');
});

function mountScene(
  id: string,
  scene: { dispose?: () => void },
  options: {
    writeParam?: Mock<(key: string, value: string | number | boolean) => void>;
    sceneWriter?: SceneParamWriter;
  } = {}
): {
  mount: HTMLElement;
  handle: Handle;
  writeParam: Mock<(key: string, value: string | number | boolean) => void>;
} {
  const createControls = captured.byId.get(id);
  if (!createControls) throw new Error(`createControls missing for ${id}`);
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const writeParam =
    options.writeParam ??
    vi.fn<(key: string, value: string | number | boolean) => void>();
  const handle = createControls({
    mount,
    scene,
    writeParam,
    scheduleRender: vi.fn(),
    sceneWriter: options.sceneWriter
  });
  pendingDispose.push(() => {
    handle.dispose();
    mount.remove();
    scene.dispose?.();
    options.sceneWriter?.close();
  });
  return { mount, handle, writeParam };
}

function paintUrl(
  meta: SceneMeta,
  scene: SceneInstance,
  handle: Handle,
  mount: HTMLElement,
  params: Record<string, number | string>,
  paramSync?: { activeKeys?: string[] }
): void {
  applySceneUrlParams(
    meta,
    {
      scene,
      controls: handle,
      mount,
      scheduleRender: () => scene.render()
    },
    paramSync,
    params
  );
}

function activePresetId(mount: HTMLElement, key: string): string {
  const btn = mount.querySelector(
    `[data-control-key="${key}"] button[aria-checked="true"]`
  ) as HTMLElement | null;
  return btn?.dataset.presetId ?? '';
}

function lambdaSlider(mount: HTMLElement): HTMLInputElement {
  const slider = mount.querySelector(
    'input[type="range"][data-key="lambda"]'
  ) as HTMLInputElement | null;
  if (!slider) throw new Error('lambda slider missing');
  return slider;
}

function controlDisplay(mount: HTMLElement, key: string): string {
  const node = mount.querySelector(
    `[data-control-key="${key}"]`
  ) as HTMLElement | null;
  return node?.style.display ?? 'missing';
}

function sectionDisplay(mount: HTMLElement, title: string): string {
  const node = mount.querySelector(
    `[data-control-section="${title}"]`
  ) as HTMLElement | null;
  return node?.style.display ?? 'missing';
}

function isShown(display: string): boolean {
  return display !== 'none' && display !== 'missing';
}

describe('URL first-paint silent-setter side effects (A4.1)', () => {
  it('faraday-disc: silent closed paints matching preset highlight', () => {
    const scene = createFaradayScene();
    const { mount, handle, writeParam } = mountScene('faraday-disc', scene);
    expect(activePresetId(mount, 'preset')).toBe('standard');

    paintUrl(
      faradayMeta,
      scene,
      handle,
      mount,
      { closed: 0 },
      { activeKeys: ['rotation', 'field', 'preset'] }
    );

    expect(writeParam).not.toHaveBeenCalled();
    expect(activePresetId(mount, 'preset')).toBe('open-circuit');
    expect(
      mount
        .querySelector(
          '[data-control-key="preset"] button[data-preset-id="open-circuit"]'
        )
        ?.getAttribute('aria-checked')
    ).toBe('true');
    expect(
      mount
        .querySelector(
          '[data-control-key="preset"] button[data-preset-id="standard"]'
        )
        ?.getAttribute('aria-checked')
    ).toBe('false');
  });

  it('interference-formula: silent lambda paints slider accentColor', () => {
    const scene = createInterferenceFormulaScene();
    const { mount, handle, writeParam } = mountScene(
      'interference-formula',
      scene
    );
    const slider = lambdaSlider(mount);
    const from = wavelengthToColor(650);
    const to = wavelengthToColor(450);
    expect(to).not.toBe(from);
    expect(slider.style.accentColor).toBe(from);

    paintUrl(interferenceFormulaMeta, scene, handle, mount, { lambda: 450 });

    expect(writeParam).not.toHaveBeenCalled();
    expect(slider.value).toBe('450');
    expect(slider.style.accentColor).toBe(to);
  });

  it('thin-film: silent lambda paints slider accentColor', () => {
    const scene = createThinFilmScene();
    const { mount, handle, writeParam } = mountScene('thin-film', scene);
    const slider = lambdaSlider(mount);
    const from = wavelengthToColor(550);
    const to = wavelengthToColor(450);
    expect(to).not.toBe(from);
    expect(slider.style.accentColor).toBe(from);

    paintUrl(thinFilmMeta, scene, handle, mount, { lambda: 450 });

    expect(writeParam).not.toHaveBeenCalled();
    expect(slider.value).toBe('450');
    expect(slider.style.accentColor).toBe(to);
  });

  it('wedge: silent lambda paints slider accentColor', () => {
    const scene = createWedgeScene();
    const { mount, handle, writeParam } = mountScene('wedge', scene);
    const slider = lambdaSlider(mount);
    const from = wavelengthToColor(650);
    const to = wavelengthToColor(450);
    expect(to).not.toBe(from);
    expect(slider.style.accentColor).toBe(from);

    paintUrl(wedgeMeta, scene, handle, mount, { lambda: 450 });

    expect(writeParam).not.toHaveBeenCalled();
    expect(slider.value).toBe('450');
    expect(slider.style.accentColor).toBe(to);
  });
});

describe('tab/boundary first-paint visibility lock (A5.5)', () => {
  it('dynamic-circle: URL tab+boundary lock field visibility via subscribe', () => {
    const scene = createDynamicCircleScene();
    const writer = createSceneParamWriter(
      resolveUrlSyncKeys(dynamicCircleMeta)
    );
    const { mount, handle } = mountScene('dynamic-circle', scene, {
      sceneWriter: writer
    });

    expect(isShown(controlDisplay(mount, 'theta'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'y0'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'xBound'))).toBe(true);
    expect(isShown(controlDisplay(mount, 'triX'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'circleR'))).toBe(false);

    paintUrl(dynamicCircleMeta, scene, handle, mount, {
      tab: 'translating',
      boundary: 'circle'
    });

    expect(activePresetId(mount, 'tab')).toBe('translating');
    expect(activePresetId(mount, 'boundary')).toBe('circle');
    expect(isShown(controlDisplay(mount, 'theta'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'y0'))).toBe(true);
    expect(isShown(controlDisplay(mount, 'xBound'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'triX'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'triH'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'circleR'))).toBe(true);
    expect(isShown(controlDisplay(mount, 'circleX'))).toBe(true);
    expect(isShown(controlDisplay(mount, 'circleY'))).toBe(true);
  });

  it('force-composition: URL tab locks section visibility via subscribe', () => {
    const scene = createForceCompositionScene();
    const writer = createSceneParamWriter(
      resolveUrlSyncKeys(forceCompositionMeta)
    );
    const { mount, handle } = mountScene('force-composition', scene, {
      sceneWriter: writer
    });

    expect(isShown(sectionDisplay(mount, '两力参数'))).toBe(true);
    expect(isShown(controlDisplay(mount, 'rule'))).toBe(true);
    expect(isShown(sectionDisplay(mount, '正交分解'))).toBe(false);
    expect(isShown(sectionDisplay(mount, '斜面分解'))).toBe(false);
    expect(isShown(sectionDisplay(mount, '范围演变'))).toBe(false);

    paintUrl(forceCompositionMeta, scene, handle, mount, {
      tab: 'orthogonal'
    });

    expect(activePresetId(mount, 'tab')).toBe('orthogonal');
    expect(isShown(sectionDisplay(mount, '两力参数'))).toBe(false);
    expect(isShown(controlDisplay(mount, 'rule'))).toBe(false);
    expect(isShown(sectionDisplay(mount, '正交分解'))).toBe(true);
    expect(isShown(sectionDisplay(mount, '斜面分解'))).toBe(false);
    expect(isShown(sectionDisplay(mount, '范围演变'))).toBe(false);
  });
});
