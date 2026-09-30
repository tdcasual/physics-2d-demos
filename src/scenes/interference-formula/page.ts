/**
 * 双缝干涉公式推导 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { interferenceFormulaMeta } from './scene.meta';
import { createInterferenceFormulaScene } from './scene.entry';
import { interferenceFormulaControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
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
  createControls: ({ mount, scene, writeParam = () => {} }) => {
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
        writeParam(key, value);
      },
      onAction: () => {
        // 无 action 按钮
      }
    });

    // 初始颜色
    const initialLambda = ifScene.getState().params.lambda;
    updateLambdaSliderColor(mount, initialLambda);

    return {
      ...exposeSchemaHandle(renderer),
      setValue: (key: string, value: number | string | boolean) => {
        renderer.setValue(key, value);
        if (key === 'lambda') updateLambdaSliderColor(mount, Number(value));
      },
      setValueSilently: (key: string, value: number | string | boolean) => {
        renderer.setValueSilently(key, value);
        if (key === 'lambda') updateLambdaSliderColor(mount, Number(value));
      }
    };
  }
});
