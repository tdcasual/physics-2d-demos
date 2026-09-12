/**
 * 游标卡尺 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { vernierCaliperMeta } from './scene.meta';
import { createVernierCaliperScene } from './scene.entry';
import { caliperControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: vernierCaliperMeta,
  // objectType/precision 是 preset-group，URL 参数回写走 setActive
  paramSync: { activeKeys: ['objectType', 'precision'] },
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
    return createVernierCaliperScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const caliperScene = scene as ReturnType<typeof createVernierCaliperScene>;

    const renderer = renderSchema({
      mount,
      schema: caliperControlsSchema,
      onChange: (key, value) => {
        if (key === 'objectType') {
          caliperScene.setParams({ objectType: parseInt(String(value), 10) });
        } else if (key === 'precision') {
          caliperScene.setParams({
            precision: parseFloat(String(value)) as 0.02 | 0.05 | 0.1
          });
        }
        scheduleRender();
        writeParam(key, value);
      },
      onAction: (key) => {
        if (key === 'reveal') {
          caliperScene.setRevealAnswer(true);
          scheduleRender();
        }
      }
    });

    return renderer;
  }
});
