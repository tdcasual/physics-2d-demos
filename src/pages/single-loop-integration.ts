import { writeSceneParams } from '../app/url-sync';
import type { SceneInstance } from '../app/scene-bootstrapper-types';
import { renderSchema } from '../ui/components/SchemaRenderer';
import { singleLoopControlsSchema } from '../scenes/single-loop/controls-schema';
import {
  restoredUrlParams,
  type SingleLoopParams
} from '../scenes/single-loop/scene.sim';

const NUMBER_KEYS = [
  'initialVelocity',
  'fieldStrength',
  'mass',
  'resistance'
] as const;

type SingleLoopScene = SceneInstance & {
  getParams(): SingleLoopParams;
  setParams(params: Partial<SingleLoopParams>): SingleLoopParams;
  subscribe(listener: () => void): () => void;
};

/** Keep page transport actions and URL state in the same reset/play/pause path. */
export function withSingleLoopUrlSync<TScene extends SingleLoopScene>(
  scene: TScene
): TScene {
  const originalReset = scene.reset?.bind(scene);
  const originalStartAll = scene.startAll?.bind(scene);
  const originalPauseAll = scene.pauseAll?.bind(scene);
  if (!originalReset || !originalStartAll || !originalPauseAll) {
    throw new Error('single-loop transport methods are required');
  }
  const syncUrl = (): void => {
    writeSceneParams(restoredUrlParams(scene.getParams()));
  };
  return {
    ...scene,
    reset(): void {
      originalReset();
      syncUrl();
    },
    startAll(): void {
      originalStartAll();
      syncUrl();
    },
    pauseAll(): void {
      originalPauseAll();
      syncUrl();
    }
  } as TScene;
}

type CreateSingleLoopControlsOptions = {
  mount: HTMLElement;
  scene: SingleLoopScene;
  scheduleRender?: () => void;
  writeParam?: (key: string, value: number | string | boolean) => void;
};

/** The one controls factory used by both the page and reset integration tests. */
export function createSingleLoopControls({
  mount,
  scene,
  scheduleRender,
  writeParam
}: CreateSingleLoopControlsOptions): {
  setValue: (key: string, value: number | string | boolean) => void;
  setActive: (key: string, value: string) => void;
  refresh: () => void;
  dispose: () => void;
} {
  const render = scheduleRender ?? (() => scene.render());
  let applying = false;
  let last = scene.getParams();

  const renderer = renderSchema({
    mount,
    schema: singleLoopControlsSchema,
    onChange: (key, value) => {
      if (applying) return;
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        scene.setParams({ [key]: n } as Partial<SingleLoopParams>);
        writeParam?.(key, n);
      }
      last = scene.getParams();
      render();
    },
    onAction: () => {}
  });

  const applySilently = <T>(update: () => T): T => {
    const wasApplying = applying;
    applying = true;
    try {
      return update();
    } finally {
      applying = wasApplying;
      if (!wasApplying) last = scene.getParams();
    }
  };

  const syncControls = (
    params: SingleLoopParams,
    changedOnly = false
  ): void => {
    applySilently(() => {
      for (const key of NUMBER_KEYS) {
        if (changedOnly && params[key] === last[key]) continue;
        renderer.setValue(key, params[key]);
      }
    });
  };

  const unsubscribe = scene.subscribe(() => {
    syncControls(scene.getParams(), true);
  });

  return {
    setValue: (key, value) =>
      applySilently(() => renderer.setValue(key, value)),
    setActive: (key, value) =>
      applySilently(() => renderer.setActive(key, value)),
    refresh: () => syncControls(scene.getParams()),
    dispose: () => {
      unsubscribe();
      renderer.dispose();
    }
  };
}
