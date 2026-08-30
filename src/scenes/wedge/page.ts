/**
 * 劈尖干涉 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
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
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const wedgeScene = scene as ReturnType<typeof createWedgeScene>;

    const renderer = renderSchema({
      mount,
      schema: wedgeControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          wedgeScene.setParams({ step: String(value) as WedgeStep });
          scheduleRender();
          renderer.setActive(key, String(value));
        } else if (key === 'lambda') {
          const num = Number(value);
          wedgeScene.setParams({ lambda: num });
          updateLambdaSliderColor(mount, num);
          scheduleRender();
        } else if (key === 'cursorX') {
          wedgeScene.setCursorX(Number(value) / 100);
          scheduleRender();
        } else {
          wedgeScene.setParams({ [key]: Number(value) } as Record<
            string,
            number
          >);
          scheduleRender();
        }
        writeParam(key, value);
      },
      onAction: () => {}
    });

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
