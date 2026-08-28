/**
 * 劈尖干涉 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { wedgeMeta } from './scene.meta';
import { createWedgeScene } from './scene.entry';
import { wedgeControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { wavelengthToColor } from '../../core/wavelength';
import type { WedgeStep } from './scene.sim';

function updateLambdaSliderColor(mount: HTMLElement, lambda: number): void {
  const slider = mount.querySelector(
    'input[type="range"][data-key="lambda"]'
  ) as HTMLInputElement | null;
  if (slider) {
    slider.style.accentColor = wavelengthToColor(lambda);
  }
}

bootScenePage({
  meta: wedgeMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    hasGraph: true,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '数据读数',
    hideTransport: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createWedgeScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene }) => {
    const wedgeScene = scene as ReturnType<typeof createWedgeScene>;

    const renderer = renderSchema({
      mount,
      schema: wedgeControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          wedgeScene.setParams({ step: String(value) as WedgeStep });
          wedgeScene.render();
          renderer.setActive(key, String(value));
        } else if (key === 'lambda') {
          const num = Number(value);
          wedgeScene.setParams({ lambda: num });
          updateLambdaSliderColor(mount, num);
          wedgeScene.render();
        } else if (key === 'cursorX') {
          wedgeScene.setCursorX(Number(value) / 100);
          wedgeScene.render();
        } else {
          wedgeScene.setParams({ [key]: Number(value) } as Record<
            string,
            number
          >);
          wedgeScene.render();
        }
        writeSceneParams({ [key]: value });
      },
      onAction: () => {}
    });

    // Apply URL params
    const urlParams = readSceneParams(wedgeMeta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'step') {
        wedgeScene.setParams({ step: String(value) as WedgeStep });
        renderer.setActive(key, String(value));
      } else if (key === 'lambda') {
        const num = parseInt(String(value), 10);
        wedgeScene.setParams({ lambda: num });
        renderer.setValue(key, num);
        updateLambdaSliderColor(mount, num);
      } else if (key === 'cursorX') {
        const num = parseInt(String(value), 10);
        wedgeScene.setCursorX(num / 100);
        renderer.setValue(key, num);
      } else if (key in wedgeMeta.defaultParams) {
        const num = Number.isInteger(wedgeMeta.defaultParams[key])
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        wedgeScene.setParams({ [key]: num } as Record<string, number>);
        renderer.setValue(key, num);
      }
    }
    if (Object.keys(urlParams).length > 0) {
      wedgeScene.render();
    }

    // 初始颜色
    const initialLambda = wedgeScene.getState().params.lambda;
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
