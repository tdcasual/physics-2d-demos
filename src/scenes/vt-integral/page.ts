import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem, Theme } from '../../app/layouts/types';
import type { TeachingMode } from '../../platform/standards';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { vtIntegralControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { VtIntegralSnapshot } from './scene.sim';
import { isValidVtScene } from './scene-values';
import { createSceneListener } from '../../app/scene-listener';

function sceneLabel(scene: VtIntegralSnapshot['params']['scene']): string {
  if (scene === 'scene1') return '场景一：v-t积分';
  if (scene === 'scene2') return '场景二：曲线长度';
  return '场景三：圆周逼近';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function formatReadout(
  snapshot: VtIntegralSnapshot,
  mode: TeachingMode
): ReadoutItem[] {
  if (snapshot.params.scene === 'scene1') {
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(mode) },
      { label: '矩形总面积', value: snapshot.metrics.rectArea.toFixed(4) },
      { label: '积分面积', value: snapshot.metrics.trueArea.toFixed(4) },
      { label: '绝对误差', value: snapshot.metrics.absErr.toFixed(4) },
      {
        label: '相对误差',
        value: `${(snapshot.metrics.relErr * 100).toFixed(2)}%`
      }
    ];
  }
  if (snapshot.params.scene === 'scene2') {
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(mode) },
      { label: '曲线振幅', value: snapshot.params.curveAmplitude.toFixed(2) },
      { label: '曲线长度', value: snapshot.metrics.curveLength.toFixed(3) },
      { label: '直线距离', value: snapshot.metrics.lineDistance.toFixed(3) }
    ];
  }
  if (snapshot.params.scene === 'scene3') {
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(mode) },
      { label: '边数 n', value: String(snapshot.params.circleN) },
      { label: '多边形周长', value: (2 * snapshot.params.circleN * Math.sin(Math.PI / snapshot.params.circleN)).toFixed(4) },
      { label: '圆周长 (2π)', value: (2 * Math.PI).toFixed(4) },
      {
        label: '周长差',
        value: snapshot.metrics.circumferenceDiff.toFixed(4)
      }
    ];
  }
  return [];
}

bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;
    const { subscribe, notify } = createSceneListener();

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), currentMode);
      },
      subscribe,
      setMode(m: 'normal' | 'presentation', hints?: unknown) {
        currentMode = m;
        scene.setMode(m, hints as Parameters<typeof scene.setMode>[1]);
        notify();
      },
      setTheme(t: Theme) {
        scene.setTheme(t);
        notify();
      },
      dispose() {
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, onStatus }) => {
    const renderer = renderSchema({
      mount,
      schema: vtIntegralControlsSchema,
      onChange: (key, value) => {
        if (key === 'scene') {
          const sceneId = String(value);
          if (isValidVtScene(sceneId)) {
            scene.setScene(sceneId);
            scene.render();
            renderer.setActive(key, sceneId);
          }
        } else if (key === 'rects') {
          scene.setRects(value as number);
          scene.render();
        } else if (key === 'time') {
          scene.setTime(value as number);
          scene.render();
        } else if (key === 'amplitude') {
          scene.setCurveAmplitude(value as number);
          scene.render();
        } else if (key === 'circle-n') {
          scene.setCircleN(value as number);
          scene.render();
        }
      },
      onAction: (key) => {
        if (key === 'constant') {
          // scene.setPreset?.('constant');
          onStatus?.('匀速运动 v(t)=2');
        } else if (key === 'linear') {
          onStatus?.('匀加速运动 v(t)=0.5t');
        } else if (key === 'quadratic') {
          onStatus?.('变加速运动 v(t)=0.1t²');
        } else if (key === 'sine') {
          onStatus?.('正弦运动 v(t)=sin(t)');
        } else if (key === 'transport:play') {
          scene.step(0.1);
          scene.render();
        } else if (key === 'transport:pause') {
          // no-op
        } else if (key === 'transport:reset') {
          scene.reset?.();
        } else if (key === 'transport:step') {
          scene.step(0.1);
          scene.render();
        }
      }
    });

    return {
      dispose: () => {
        renderer.dispose();
      }
    };
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
