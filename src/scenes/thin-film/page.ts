/**
 * 薄膜干涉 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { thinFilmMeta } from './scene.meta';
import { createThinFilmScene } from './scene.entry';
import { thinFilmControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { wavelengthToColor } from '../../core/wavelength';
import type { ThinFilmStep } from './scene.sim';

function updateLambdaSliderColor(mount: HTMLElement, lambda: number): void {
  const slider = mount.querySelector(
    'input[type="range"][data-key="lambda"]'
  ) as HTMLInputElement | null;
  if (slider) {
    slider.style.accentColor = wavelengthToColor(lambda);
  }
}

bootScenePage({
  meta: thinFilmMeta,
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
    hideTransport: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createThinFilmScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene }) => {
    const filmScene = scene as ReturnType<typeof createThinFilmScene>;

    const renderer = renderSchema({
      mount,
      schema: thinFilmControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          filmScene.setParams({ step: String(value) as ThinFilmStep });
          renderer.setActive(key, String(value));
        } else if (key === 'lambda') {
          const num = Number(value);
          filmScene.setParams({ lambda: num });
          updateLambdaSliderColor(mount, num);
        } else if (key === 'whiteLight') {
          filmScene.setParams({ whiteLight: Boolean(value) });
          // 白光模式下灰化波长滑块
          const lambdaSlider = mount.querySelector(
            'input[type="range"][data-key="lambda"]'
          ) as HTMLInputElement | null;
          if (lambdaSlider) lambdaSlider.disabled = Boolean(value);
        } else if (key === 'cursorY') {
          filmScene.setCursorY(Number(value) / 100);
        } else {
          filmScene.setParams({ [key]: Number(value) } as Record<
            string,
            number
          >);
        }
        filmScene.render();
        writeSceneParams({ [key]: value });
      },
      onAction: () => {}
    });

    // Apply URL params
    const urlParams = readSceneParams(thinFilmMeta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'step') {
        filmScene.setParams({ step: String(value) as ThinFilmStep });
        renderer.setActive(key, String(value));
      } else if (key === 'lambda') {
        const num = parseInt(String(value), 10);
        filmScene.setParams({ lambda: num });
        renderer.setValue(key, num);
        updateLambdaSliderColor(mount, num);
      } else if (key === 'whiteLight') {
        filmScene.setParams({ whiteLight: value === 'true' });
        renderer.setValue(key, value === 'true');
      } else if (key === 'cursorY') {
        const num = parseInt(String(value), 10);
        filmScene.setCursorY(num / 100);
        renderer.setValue(key, num);
      } else if (key in thinFilmMeta.defaultParams) {
        const num = Number.isInteger(
          thinFilmMeta.defaultParams[
            key as keyof typeof thinFilmMeta.defaultParams
          ]
        )
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        filmScene.setParams({ [key]: num } as Record<string, number>);
        renderer.setValue(key, num);
      }
    }
    if (Object.keys(urlParams).length > 0) {
      filmScene.render();
    }

    // 初始颜色和滑块状态
    const initialLambda = filmScene.getState().params.lambda;
    updateLambdaSliderColor(mount, initialLambda);
    const initialWhiteLight = filmScene.getState().params.whiteLight;
    const lambdaSlider = mount.querySelector(
      'input[type="range"][data-key="lambda"]'
    ) as HTMLInputElement | null;
    if (lambdaSlider && initialWhiteLight) lambdaSlider.disabled = true;

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
