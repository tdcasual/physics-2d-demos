/**
 * 双缝干涉公式推导 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { interferenceFormulaMeta } from './scene.meta';
import { createInterferenceFormulaScene } from './scene.entry';
import { interferenceFormulaControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { wavelengthToColor } from './scene.view';
import type { InterferenceFormulaStep } from './scene.sim';

function updateLambdaSliderColor(mount: HTMLElement, lambda: number): void {
  const slider = mount.querySelector(
    'input[type="range"][data-key="lambda"]'
  ) as HTMLInputElement | null;
  if (slider) {
    slider.style.accentColor = wavelengthToColor(lambda);
  }
}

bootScenePage({
  meta: interferenceFormulaMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '数据读数',
    hideTransport: true,
    hasGraph: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createInterferenceFormulaScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene }) => {
    const ifScene = scene as ReturnType<typeof createInterferenceFormulaScene>;

    const renderer = renderSchema({
      mount,
      schema: interferenceFormulaControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          ifScene.setParams({ step: String(value) as InterferenceFormulaStep });
          renderer.setActive(key, String(value));
        } else if (key === 'lambda') {
          const num = Number(value);
          ifScene.setParams({ lambda: num });
          updateLambdaSliderColor(mount, num);
        } else {
          ifScene.setParams({ [key]: Number(value) } as Record<string, number>);
        }
        writeSceneParams({ [key]: value });
      },
      onAction: () => {
        // 无 action 按钮
      }
    });

    // Apply URL params
    const urlParams = readSceneParams(interferenceFormulaMeta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'step') {
        ifScene.setParams({ step: String(value) as InterferenceFormulaStep });
        renderer.setActive(key, String(value));
      } else if (key === 'lambda') {
        const num = parseInt(String(value), 10);
        ifScene.setParams({ lambda: num });
        renderer.setValue(key, num);
        updateLambdaSliderColor(mount, num);
      } else if (key in interferenceFormulaMeta.defaultParams) {
        const num = Number.isInteger(interferenceFormulaMeta.defaultParams[key])
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        ifScene.setParams({ [key]: num } as Record<string, number>);
        renderer.setValue(key, num);
      }
    }

    // 初始颜色
    const initialLambda = ifScene.getState().params.lambda;
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
