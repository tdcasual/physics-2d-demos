import { bootScenePage } from '../../app/scene-bootstrapper';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { vtIntegralControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { isValidVtScene } from './scene-values';
import type { VtCurveKind } from './scene.sim';

/**
 * getParams().scene 是 1 基数字（scene1→1, scene2→2, scene3→3），
 * scene-selector 的 id 是 'scene1'..'scene3'。
 */
export function decodeVtSceneSelectorId(scene: number | string): string {
  if (scene === 'scene1' || scene === 'scene2' || scene === 'scene3') {
    return scene;
  }
  const n = Number(scene);
  if (n === 2) return 'scene2';
  if (n === 3) return 'scene3';
  return 'scene1';
}

const CURVE_KEYS: readonly VtCurveKind[] = [
  'constant',
  'linear',
  'quadratic',
  'sine'
];

bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      }
    };
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam
  }) => {
    const renderer = renderSchema({
      mount,
      schema: vtIntegralControlsSchema,
      onChange: (key, value) => {
        if (key === 'scene') {
          const sceneId = String(value);
          if (isValidVtScene(sceneId)) {
            scene.setScene(sceneId);
            scheduleRender();
            renderer.setActive(key, sceneId);
            writeParam?.(key, sceneId);
          }
        } else if (key === 'n') {
          scene.setParams({ n: value as number });
          scheduleRender();
          writeParam?.(key, value);
        }
      },
      onAction: (key) => {
        if ((CURVE_KEYS as readonly string[]).includes(key)) {
          scene.setCurveKind(key as VtCurveKind);
          scheduleRender();
        }
      }
    });

    const syncFromScene = (): void => {
      const params = scene.getParams();
      renderer.setActiveSilently(
        'scene',
        decodeVtSceneSelectorId(params.scene)
      );
      renderer.setValueSilently('n', params.n);
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene
    };
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideTransport: true
  }
});
