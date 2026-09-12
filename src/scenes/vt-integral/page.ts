import { bootScenePage } from '../../app/scene-bootstrapper';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { vtIntegralControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { isValidVtScene } from './scene-values';
import type { VtCurveKind } from './scene.sim';

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
  createControls: ({ mount, scene, scheduleRender = () => scene.render() }) => {
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
          }
        } else if (key === 'n') {
          scene.setParams({ n: value as number });
          scheduleRender();
        }
      },
      onAction: (key) => {
        if ((CURVE_KEYS as readonly string[]).includes(key)) {
          scene.setCurveKind(key as VtCurveKind);
          scheduleRender();
        }
      }
    });

    return {
      dispose: () => {
        renderer.dispose();
      }
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
