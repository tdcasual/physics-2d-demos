/**
 * 多普勒效应 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { dopplerEffectMeta } from './scene.meta';
import { createDopplerScene } from './scene.entry';
import { dopplerControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { DopplerMode } from './scene.sim';

bootScenePage({
  meta: dopplerEffectMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '数据读数',
    hideTransport: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createDopplerScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene }) => {
    const dsScene = scene as ReturnType<typeof createDopplerScene>;

    const renderer = renderSchema({
      mount,
      schema: dopplerControlsSchema,
      onChange: (key, value) => {
        if (
          key === 'sourceSpeed' ||
          key === 'observerSpeed' ||
          key === 'emitFrequency' ||
          key === 'playbackSpeed'
        ) {
          dsScene.setParams({ [key]: Number(value) });
        } else if (key === 'mode') {
          dsScene.setParams({ mode: String(value) as DopplerMode });
          renderer.setActive(key, String(value));
          syncRendererToScene();
        } else if (key === 'audioEnabled') {
          if (value) {
            if (!dsScene.getState().params.audioEnabled) {
              dsScene.enableAudio();
            }
          } else {
            dsScene.disableAudio();
          }
          dsScene.setParams({ audioEnabled: Boolean(value) });
        } else if (key === 'audioVolume') {
          const vol = Number(value) / 100;
          dsScene.setParams({ audioVolume: vol });
          dsScene.setVolume(vol);
        } else if (key === 'preset') {
          applyPreset(String(value));
        }
        dsScene.render();
        if (key !== 'preset') writeSceneParams({ [key]: value });
      },
      onAction: () => {}
    });

    function applyPreset(preset: string): void {
      switch (preset) {
        case 'static':
          dsScene.setParams({ sourceSpeed: 0, observerSpeed: 0 });
          break;
        case 'approach':
          dsScene.setParams({ sourceSpeed: 3, observerSpeed: 0 });
          break;
        case 'recede':
          dsScene.setParams({ sourceSpeed: -3, observerSpeed: 0 });
          break;
        case 'low-freq':
          dsScene.setParams({ emitFrequency: 1, sourceSpeed: 2 });
          break;
      }
      syncRendererToScene();
    }

    function syncRendererToScene(): void {
      const s = dsScene.getState();
      renderer.setValue('sourceSpeed', s.params.sourceSpeed);
      renderer.setValue('observerSpeed', s.params.observerSpeed);
      renderer.setValue('emitFrequency', s.params.emitFrequency);
      renderer.setValue('playbackSpeed', s.params.playbackSpeed);
      renderer.setValue('audioEnabled', s.params.audioEnabled);
      renderer.setValue('audioVolume', s.params.audioVolume * 100);
      renderer.setActive('mode', s.params.mode);
    }

    // 应用 URL 参数
    const urlParams = readSceneParams(dopplerEffectMeta);
    const batchParams: Record<string, unknown> = {};
    if (urlParams.sourceSpeed !== undefined)
      batchParams.sourceSpeed = parseFloat(String(urlParams.sourceSpeed));
    if (urlParams.observerSpeed !== undefined)
      batchParams.observerSpeed = parseFloat(String(urlParams.observerSpeed));
    if (urlParams.emitFrequency !== undefined)
      batchParams.emitFrequency = parseFloat(String(urlParams.emitFrequency));
    if (urlParams.mode !== undefined)
      batchParams.mode = String(urlParams.mode) as DopplerMode;

    if (Object.keys(batchParams).length > 0) {
      dsScene.setParams(batchParams);
    }
    syncRendererToScene();

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
