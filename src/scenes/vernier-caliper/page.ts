/**
 * 游标卡尺 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { vernierCaliperMeta } from './scene.meta';
import { createVernierCaliperScene } from './scene.entry';
import { caliperControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: vernierCaliperMeta,
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
  createControls: ({ mount, scene }) => {
    const caliperScene = scene as ReturnType<typeof createVernierCaliperScene>;

    const renderer = renderSchema({
      mount,
      schema: caliperControlsSchema,
      onChange: (key, value) => {
        if (key === 'objectType') {
          caliperScene.setParams({ objectType: parseInt(String(value), 10) });
        } else if (key === 'precision') {
          caliperScene.setParams({ precision: parseFloat(String(value)) as 0.02 | 0.05 | 0.1 });
        }
        caliperScene.render();
        writeSceneParams({ [key]: value });
      },
      onAction: () => {}
    });

    // Apply URL params
    const urlParams = readSceneParams(vernierCaliperMeta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'objectType') {
        const num = parseInt(String(value), 10);
        caliperScene.setParams({ objectType: num });
        renderer.setActive(key, String(num));
      } else if (key === 'precision') {
        const num = parseFloat(String(value));
        caliperScene.setParams({ precision: num as 0.02 | 0.05 | 0.1 });
        renderer.setActive(key, String(num));
      } else if (key in vernierCaliperMeta.defaultParams) {
        const num = Number.isInteger(vernierCaliperMeta.defaultParams[key])
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        caliperScene.setParams({ [key]: num } as Record<string, number>);
        renderer.setValue(key, num);
      }
    }
    if (Object.keys(urlParams).length > 0) {
      caliperScene.render();
    }

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose() {
        renderer.dispose();
      }
    };
  }
});
