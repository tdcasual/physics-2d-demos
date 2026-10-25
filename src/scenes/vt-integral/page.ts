import { bootScenePage } from '../../app/scene-bootstrapper';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { vtIntegralControlsSchema } from './controls-schema';
import { createBoundControls } from '../../ui/components/bound-controls';
import type { VtCurveKind } from './scene.sim';

const CURVE_KEYS: readonly VtCurveKind[] = [
  'constant',
  'linear',
  'quadratic',
  'sine'
];

// 子场景 / 取法的编码与控件显隐均在 controls-schema 声明（bind.values、
// visibleWhen），URL 恢复、remount 投影与写回由平台统一处理。
bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      demoHints,
      theme
    });

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: vtIntegralControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key) => {
        if ((CURVE_KEYS as readonly string[]).includes(key)) {
          scene.setCurveKind(key as VtCurveKind);
        }
      }
    }),
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideTransport: true
  }
});
