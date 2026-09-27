/**
 * 薄膜干涉 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { thinFilmMeta } from './scene.meta';
import { createThinFilmScene } from './scene.entry';
import { thinFilmControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { wavelengthToColor } from '../../core/wavelength';
import type { ThinFilmProfile, ThinFilmStep } from './scene.sim';

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
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '数据读数',
    hideTransport: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createThinFilmScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const filmScene = scene as ReturnType<typeof createThinFilmScene>;

    const renderer = renderSchema({
      mount,
      schema: thinFilmControlsSchema,
      onChange: (key, value) => {
        if (key === 'step') {
          filmScene.setParams({ step: String(value) as ThinFilmStep });
          renderer.setActive(key, String(value));
        } else if (key === 'profile') {
          const profile = String(value) as ThinFilmProfile;
          filmScene.setParams({ profile });
          renderer.setActive(key, profile);
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
        scheduleRender();
        writeParam(key, value);
      },
      onAction: () => {}
    });

    // 初始颜色和滑块状态
    const initialLambda = filmScene.getState().params.lambda;
    updateLambdaSliderColor(mount, initialLambda);
    const initialWhiteLight = filmScene.getState().params.whiteLight;
    const lambdaSlider = mount.querySelector(
      'input[type="range"][data-key="lambda"]'
    ) as HTMLInputElement | null;
    if (lambdaSlider && initialWhiteLight) lambdaSlider.disabled = true;

    const canvas = document.querySelector(
      '.teaching-stage-slot canvas, .srgb-stage-slot canvas, canvas'
    ) as HTMLCanvasElement | null;
    const onPointer = (event: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const t = filmScene.pickCursor(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      if (t == null) return;
      filmScene.setCursorY(t);
      renderer.setValue('cursorY', Math.round(t * 100));
      scheduleRender();
    };
    canvas?.addEventListener('pointerdown', onPointer);

    return {
      ...exposeSchemaHandle(renderer),
      setValue: (key: string, value: number | string | boolean) => {
        renderer.setValue(key, value);
        if (key === 'lambda') updateLambdaSliderColor(mount, Number(value));
      },
      dispose: () => {
        canvas?.removeEventListener('pointerdown', onPointer);
        renderer.dispose();
      }
    };
  }
});
