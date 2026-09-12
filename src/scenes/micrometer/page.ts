/**
 * 螺旋测微仪 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { micrometerMeta } from './scene.meta';
import { createMicrometerScene } from './scene.entry';
import {
  MICROMETER_PRESET_MM,
  micrometerControlsSchema
} from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: micrometerMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '测量读数',
    hideTransport: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createMicrometerScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const microScene = scene as ReturnType<typeof createMicrometerScene>;

    const renderer = renderSchema({
      mount,
      schema: micrometerControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          // 预设语义 = 设定 reading 数值；setValue 派发 input 事件，
          // 经由 reading 的 onChange 统一完成 setParams/scheduleRender/writeParam
          const val = MICROMETER_PRESET_MM[String(value)];
          if (val !== undefined) renderer.setValue('reading', val);
          writeParam('preset', String(value));
          return;
        }
        if (key === 'reading') {
          microScene.setParams({ reading: parseFloat(String(value)) });
        }
        scheduleRender();
        writeParam(key, value);
      },
      onAction: (key) => {
        if (key === 'reveal') {
          microScene.setRevealAnswer(true);
          scheduleRender();
        }
      }
    });

    return renderer;
  }
});
