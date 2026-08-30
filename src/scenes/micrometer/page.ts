/**
 * 螺旋测微仪 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { micrometerMeta } from './scene.meta';
import { createMicrometerScene } from './scene.entry';
import { micrometerControlsSchema } from './controls-schema';
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
        if (key === 'reading') {
          microScene.setParams({ reading: parseFloat(String(value)) });
        }
        scheduleRender();
        writeParam(key, value);
      },
      onAction: (key) => {
        if (key === 'preset') {
          // preset 按钮点击时，通过 onChange 回调中的 key='preset' 处理
        }
      }
    });

    // 自定义 preset 处理：preset 按钮设置 reading 值
    const presetContainer = mount.querySelector('[data-field="preset"]');
    const onPresetClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('[data-preset-id]');
      if (btn) {
        const val = parseFloat(
          (btn as HTMLElement).dataset.presetId || '4.593'
        );
        microScene.setParams({ reading: val });
        renderer.setValue('reading', val);
        scheduleRender();
        writeParam('reading', val);
      }
    };
    if (presetContainer) {
      presetContainer.addEventListener('click', onPresetClick);
    }

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose() {
        if (presetContainer) {
          presetContainer.removeEventListener('click', onPresetClick);
        }
        renderer.dispose();
      }
    };
  }
});
