/**
 * 机械波 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { mechanicalWaveMeta } from './scene.meta';
import { createMechanicalWaveScene } from './scene.entry';
import { mechanicalWaveControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: mechanicalWaveMeta,
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
    // entry 只有 setParam 单键 API，且波速/波长/周期存在 v=λ/T 约束联动，
    // 应用后必须借控制面板句柄做全量回读同步（syncRendererToScene 内含
    // isUpdatingFromSim 守卫，避免 setValue 重入 onChange）。
    applyAll: (urlParams, ctx) => {
      const scene = ctx.scene as ReturnType<typeof createMechanicalWaveScene>;
      const waveParamKeys = [
        'waveSpeed',
        'wavelength',
        'period',
        'amplitude',
        'playbackSpeed'
      ];
      for (const [key, value] of Object.entries(urlParams)) {
        if (key === 'direction') {
          scene.setParam('direction', String(value));
        } else if (waveParamKeys.includes(key)) {
          scene.setParam(key, Number(value));
        }
      }
      (
        ctx.controls as { syncFromScene?: () => void } | null
      )?.syncFromScene?.();
      return true;
    }
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createMechanicalWaveScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const mwScene = scene as ReturnType<typeof createMechanicalWaveScene>;
    let isUpdatingFromSim = false;

    const renderer = renderSchema({
      mount,
      schema: mechanicalWaveControlsSchema,
      onChange: (key, value) => {
        if (isUpdatingFromSim) return;

        if (
          key === 'waveSpeed' ||
          key === 'wavelength' ||
          key === 'period' ||
          key === 'amplitude' ||
          key === 'playbackSpeed'
        ) {
          mwScene.setParam(key, Number(value));
          // 约束系统可能修改了另一个参数，回读并更新
          syncWaveParams();
        } else if (key === 'direction') {
          mwScene.setParam('direction', String(value));
          renderer.setActive(key, String(value));
        } else if (key === 'showMicroShift') {
          mwScene.setParam('showMicroShift', value ? 1 : 0);
        }
        scheduleRender();
        writeParam(key, value);
      },
      onAction: () => {}
    });

    function syncWaveParams(): void {
      isUpdatingFromSim = true;
      const s = mwScene.getState();
      renderer.setValue('waveSpeed', s.params.waveSpeed);
      renderer.setValue('wavelength', s.params.wavelength);
      renderer.setValue('period', s.params.period);
      renderer.setValue('amplitude', s.params.amplitude);
      renderer.setValue('playbackSpeed', s.params.playbackSpeed);
      isUpdatingFromSim = false;
    }

    function syncRendererToScene(): void {
      const s = mwScene.getState();
      isUpdatingFromSim = true;
      renderer.setValueSilently('waveSpeed', s.params.waveSpeed);
      renderer.setValueSilently('wavelength', s.params.wavelength);
      renderer.setValueSilently('period', s.params.period);
      renderer.setValueSilently('amplitude', s.params.amplitude);
      renderer.setValueSilently('playbackSpeed', s.params.playbackSpeed);
      renderer.setValueSilently('showMicroShift', s.params.showMicroShift);
      renderer.setActiveSilently('direction', s.params.direction);
      isUpdatingFromSim = false;
    }

    // URL 参数应用（含应用后全量同步）由 bootstrapper 管线的
    // paramSync.applyAll 接管

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setValueSilently(key: string, value: number | string) {
        renderer.setValueSilently(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      setActiveSilently(key: string, value: string) {
        renderer.setActiveSilently(key, value);
      },
      fieldTypes: renderer.fieldTypes,
      syncFromScene: syncRendererToScene,
      dispose() {
        renderer.dispose();
      }
    };
  }
});
