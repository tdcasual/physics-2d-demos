/**
 * 双缝干涉 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { doubleSlitMeta } from './scene.meta';
import { createDoubleSlitScene } from './scene.entry';
import { doubleSlitControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { wavelengthToColor } from './scene.view';
import type { DoubleSlitStep } from './scene.sim';

function updateLambdaSliderColor(mount: HTMLElement, lambda: number): void {
  const slider = mount.querySelector('input[type="range"][data-key="lambda"]') as HTMLInputElement | null;
  if (slider) {
    slider.style.accentColor = wavelengthToColor(lambda);
  }
}

bootScenePage({
  meta: doubleSlitMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    hasGraph: true,
    graphHeight: 0.4,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '数据读数',
    hideTransport: true
  },
  createScene: ({ canvas, theme }) => {
    return createDoubleSlitScene({ canvas, theme });
  },
  createControls: ({ mount, scene }) => {
    const dsScene = scene as ReturnType<typeof createDoubleSlitScene>;

    const renderer = renderSchema({
      mount,
      schema: doubleSlitControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          dsScene.setParams({ step: String(value) as DoubleSlitStep });
          dsScene.render();
          renderer.setActive(key, String(value));
        } else if (key === 'lambda') {
          const num = Number(value);
          dsScene.setParams({ lambda: num });
          updateLambdaSliderColor(mount, num);
          dsScene.render();
        } else {
          dsScene.setParams({ [key]: Number(value) } as Record<string, number>);
          dsScene.render();
        }
        writeSceneParams({ [key]: value });
      },
      onAction: () => {
        // 无 action 按钮
      }
    });

    // Apply URL params
    const urlParams = readSceneParams(doubleSlitMeta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'step') {
        dsScene.setParams({ step: String(value) as DoubleSlitStep });
        renderer.setActive(key, String(value));
      } else if (key === 'lambda') {
        const num = parseInt(String(value), 10);
        dsScene.setParams({ lambda: num });
        renderer.setValue(key, num);
        updateLambdaSliderColor(mount, num);
      } else if (key in doubleSlitMeta.defaultParams) {
        const num = Number.isInteger(doubleSlitMeta.defaultParams[key])
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        dsScene.setParams({ [key]: num } as Record<string, number>);
        renderer.setValue(key, num);
      }
    }
    if (Object.keys(urlParams).length > 0) {
      dsScene.render();
    }

    // 初始颜色
    const initialLambda = dsScene.getState().params.lambda;
    updateLambdaSliderColor(mount, initialLambda);

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
        if (key === 'lambda') updateLambdaSliderColor(mount, Number(value));
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
