import { bootScenePage, type SceneInstance } from '../../app/scene-bootstrapper';
import type { ReadoutItem, Theme } from '../../app/layouts/types';
import type { TeachingMode } from '../../app/teaching-standards';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { createVtIntegralControlsV4 } from './controls-v4';
import type { VtIntegralSnapshot } from './scene.sim';
import { isValidVtScene } from './scene-values';

function sceneLabel(scene: VtIntegralSnapshot['params']['scene']): string {
  if (scene === 'scene1') return '场景一：v-t积分';
  if (scene === 'scene2') return '场景二：曲线长度';
  if (scene === 'scene3') return '场景三：圆周逼近';
  if (scene === 'scene4') return '场景四：球棱锥体积';
  return '场景五：球体体积';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function formatReadout(snapshot: VtIntegralSnapshot, mode: TeachingMode): ReadoutItem[] {
  if (snapshot.params.scene === 'scene1') {
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(mode) },
      { label: '矩形总面积', value: snapshot.metrics.rectArea.toFixed(4) },
      { label: '积分面积', value: snapshot.metrics.trueArea.toFixed(4) },
      { label: '绝对误差', value: snapshot.metrics.absErr.toFixed(4) },
      { label: '相对误差', value: `${(snapshot.metrics.relErr * 100).toFixed(2)}%` }
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
      { label: '多边形周长差', value: snapshot.metrics.circumferenceDiff.toFixed(4) }
    ];
  }
  if (snapshot.params.scene === 'scene4') {
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(mode) },
      { label: '球棱锥真实体积', value: snapshot.metrics.surfaceTrue.toFixed(4) },
      { label: '球棱锥近似体积', value: snapshot.metrics.surfaceApprox.toFixed(4) },
      { label: '相对误差', value: `${(snapshot.metrics.surfaceRelErr * 100).toFixed(2)}%` }
    ];
  }
  return [
    { label: '场景', value: sceneLabel(snapshot.params.scene) },
    { label: '显示模式', value: modeLabel(mode) },
    { label: '球体真实体积', value: snapshot.metrics.sphereTrue.toFixed(4) },
    { label: '球体近似体积', value: snapshot.metrics.sphereApprox.toFixed(4) },
    { label: '相对误差', value: `${(snapshot.metrics.sphereRelErr * 100).toFixed(2)}%` }
  ];
}

bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), currentMode);
      },
      setMode(m: 'normal' | 'presentation') {
        currentMode = m;
        scene.setMode(m);
      },
      setTheme(t: Theme) {
        scene.setTheme(t);
      }
    } as SceneInstance;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createVtIntegralControlsV4({
      mount,
      onSetScene: (value: string) => {
        if (isValidVtScene(value)) {
          (scene as unknown as { setScene(s: string): void }).setScene(value);
          scene.render();
        }
      },
      onSetRects: (value) => {
        (scene as unknown as { setRects(v: number): void }).setRects(value);
        scene.render();
      },
      onSetTime: (value) => {
        (scene as unknown as { setTime(v: number): void }).setTime(value);
        scene.render();
      },
      onSetMethod: (value: string) => {
        (scene as unknown as { setMethod(m: string): void }).setMethod(value);
        scene.render();
      },
      onSetCurveAmplitude: (value) => {
        (scene as unknown as { setCurveAmplitude(v: number): void }).setCurveAmplitude(value);
        scene.render();
      },
      onSetCircleN: (value) => {
        (scene as unknown as { setCircleN(v: number): void }).setCircleN(value);
        scene.render();
      },
      onSetSurfaceN: (value) => {
        (scene as unknown as { setSurfaceN(v: number): void }).setSurfaceN(value);
        scene.render();
      },
      onSetDivision: (value) => {
        (scene as unknown as { setDivision(v: number): void }).setDivision(value);
        scene.render();
      },
      onReset: () => {
        scene.reset?.();
        scene.render();
      },
      onStatus
    });
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
