/**
 * 机械波 — 页面启动
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
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
    hideTransport: false,
  },
  createScene: ({ canvas, theme }) => {
    return createMechanicalWaveScene({ canvas, theme });
  },
  createControls: ({ mount, scene }) => {
    const mwScene = scene as ReturnType<typeof createMechanicalWaveScene>;
    let isUpdatingFromSim = false;

    const renderer = renderSchema({
      mount,
      schema: mechanicalWaveControlsSchema,
      onChange: (key, value) => {
        if (isUpdatingFromSim) return;

        if (key === 'waveSpeed' || key === 'wavelength' || key === 'period' || key === 'amplitude' || key === 'playbackSpeed') {
          mwScene.setParam(key, Number(value));
          // 约束系统可能修改了另一个参数，回读并更新
          syncWaveParams();
        } else if (key === 'direction') {
          mwScene.setParam('direction', String(value));
          renderer.setActive(key, String(value));
        } else if (key === 'showMicroShift') {
          mwScene.setParam('showMicroShift', value ? 1 : 0);
        }
        mwScene.render();
        writeSceneParams({ [key]: value });
      },
      onAction: () => {},
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
      renderer.setValue('waveSpeed', s.params.waveSpeed);
      renderer.setValue('wavelength', s.params.wavelength);
      renderer.setValue('period', s.params.period);
      renderer.setValue('amplitude', s.params.amplitude);
      renderer.setValue('playbackSpeed', s.params.playbackSpeed);
      renderer.setValue('showMicroShift', s.params.showMicroShift);
      renderer.setActive('direction', s.params.direction);
      isUpdatingFromSim = false;
    }

    // 应用 URL 参数
    const urlParams = readSceneParams(mechanicalWaveMeta);
    const waveParamKeys = ['waveSpeed', 'wavelength', 'period', 'amplitude', 'playbackSpeed'];
    for (const [key, value] of Object.entries(urlParams)) {
      if (key === 'direction') {
        mwScene.setParam('direction', String(value));
      } else if (key === 'showMicroShift') {
        mwScene.setParam('showMicroShift', value === 'true' ? 1 : 0);
      } else if (waveParamKeys.includes(key)) {
        mwScene.setParam(key, parseFloat(String(value)));
      }
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
      },
    };
  },
});
