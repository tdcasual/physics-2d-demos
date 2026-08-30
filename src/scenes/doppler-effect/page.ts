/**
 * 多普勒效应 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { dopplerEffectMeta } from './scene.meta';
import { createDopplerScene } from './scene.entry';
import { dopplerControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { DopplerMode, DopplerParams } from './scene.sim';

bootScenePage<ReturnType<typeof createDopplerScene>>({
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
  paramSync: {
    // mode 与速度存在互斥约束（sim.setParams 按 next.mode 清零对应速度），
    // 必须单次批量 setParams 保持与原页面一致的约束语义；
    // 应用后借控制面板句柄做全量同步（含约束调整后的回读）。
    applyAll: (urlParams, ctx) => {
      const batch: Partial<DopplerParams> = {};
      if (urlParams.sourceSpeed !== undefined)
        batch.sourceSpeed = Number(urlParams.sourceSpeed);
      if (urlParams.observerSpeed !== undefined)
        batch.observerSpeed = Number(urlParams.observerSpeed);
      if (urlParams.emitFrequency !== undefined)
        batch.emitFrequency = Number(urlParams.emitFrequency);
      if (urlParams.mode !== undefined)
        batch.mode = String(urlParams.mode) as DopplerMode;

      if (Object.keys(batch).length > 0) {
        ctx.scene.setParams(batch);
      }
      (
        ctx.controls as { syncFromScene?: () => void } | null
      )?.syncFromScene?.();
      return true;
    }
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createDopplerScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
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
        scheduleRender();
        if (key !== 'preset') writeParam(key, value);
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

    // URL 参数应用（含应用后全量同步）由 bootstrapper 管线的
    // paramSync.applyAll 接管

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      syncFromScene: syncRendererToScene,
      dispose() {
        renderer.dispose();
      }
    };
  }
});
