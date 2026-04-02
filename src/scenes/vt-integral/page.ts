import '../../ui/teaching-demo.css';
import '../../ui/teaching-demo-v2.css';
import { bootLegacy2DBridgePage } from '../../app/legacy-2d-bridge-page';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import type { TeachingMode } from '../../app/teaching-standards';
import { createVtIntegralControlsV3 } from './controls-v3';
import { createVtIntegralScene } from './scene.entry';
import type { VtIntegralSnapshot } from './scene.sim';

type Renderer = 'legacy' | 'experimental';

function resolveRenderer(search: string): Renderer {
  const query = new URLSearchParams(search);
  const renderer = query.get('renderer');
  if (renderer === 'experimental') {
    return 'experimental';
  }
  return 'legacy';
}

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

function bootLegacy(mount: HTMLElement): void {
  bootLegacy2DBridgePage({
    mount,
    title: '微元法演示',
    subtitle: '右侧使用历史场景渲染，保持显示一致',
    scene: {
      sceneId: 'legacy-vt-integral',
      sourcePath: '/animations/mechanics/v-t面积与微元法.html'
    },
    setupControls: ({ shell, adapter, lifecycle }) => {
      const controls = createVtIntegralControlsV3({
        mount: shell.controlSlot,
        onSetScene: (scene) => adapter.sendControlExt('set-scene', { scene }),
        onSetRects: (value) => adapter.sendControlExt('scene1:set-rects', { value }),
        onSetTime: (value) => adapter.sendControlExt('scene1:set-time', { value }),
        onSetMethod: (method) => adapter.sendControlExt('scene1:set-method', { method }),
        onSetCurveAmplitude: (value) => adapter.sendControlExt('scene2:set-amplitude', { value }),
        onSetCircleN: (value) => adapter.sendControlExt('scene3:set-n', { value }),
        onSetSurfaceN: (value) => adapter.sendControlExt('scene4:set-surface-n', { value }),
        onSetDivision: (value) => adapter.sendControlExt('scene5:set-division', { value }),
        onReset: () => adapter.sendControl('reset'),
        onStatus: (text) => shell.setStatus(text)
      });
      lifecycle.onDispose(() => controls.dispose());
      shell.setStatus('左侧可切换微元法子场景并调参');
    }
  });
}

function bootModern(mount: HTMLElement): void {
  const shell = createTeachingDemoShell({
    mount,
    title: '微元法演示',
    subtitle: '多场景积分与逼近演示',
    defaultMode: 'normal',
    hideHeader: false,
    readoutLabel: '数据区',
    layout: {
      defaultLeftRatio: 0.35,
      leftMinWidth: 280,
      leftMaxWidth: 960,
      hasGraph: false,  // 图表在动画区内显示
      controlColumns: 'auto',
      readoutCollapsed: true,
    }
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let snapshot: VtIntegralSnapshot | null = null;

  const scene = createVtIntegralScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    theme: shell.getTheme(),
    onReadout: (next) => {
      snapshot = next;
      shell.setReadout(formatReadout(next, shell.getMode()));
    }
  });
  lifecycle.onDispose(() => scene.dispose());

  const transport = createSceneShell({
    stepSeconds: 1 / 60,
    maxSubSteps: 5,
    onStep: (dt) => scene.step(dt),
    onRender: () => scene.render()
  });
  lifecycle.onDispose(() => transport.dispose());

  const controls = createVtIntegralControlsV3({
    mount: shell.controlSlot,
    onSetScene: (value: string) => {
      scene.setScene(value as import('./scene.sim').VtScene);
      scene.render();
    },
    onSetRects: (value) => {
      scene.setRects(value);
      scene.render();
    },
    onSetTime: (value) => {
      scene.setTime(value);
      scene.render();
    },
    onSetMethod: (value: string) => {
      scene.setMethod(value as import('./scene.sim').VtMethod);
      scene.render();
    },
    onSetCurveAmplitude: (value) => {
      scene.setCurveAmplitude(value);
      scene.render();
    },
    onSetCircleN: (value) => {
      scene.setCircleN(value);
      scene.render();
    },
    onSetSurfaceN: (value) => {
      scene.setSurfaceN(value);
      scene.render();
    },
    onSetDivision: (value) => {
      scene.setDivision(value);
      scene.render();
    },
    onReset: () => {
      transport.reset();
      scene.reset();
      scene.render();
    },
    onStatus: (text) => shell.setStatus(text)
  });
  lifecycle.onDispose(() => controls.dispose());

  const onModeToggle = () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    scene.setMode(nextMode);
    scene.resize();
    scene.render();
    if (snapshot) shell.setReadout(formatReadout(snapshot, shell.getMode()));
    shell.setStatus(nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启');
  };

  const onThemeToggle = () => {
    const nextTheme = shell.getTheme() === 'dark' ? 'light' : 'dark';
    shell.setTheme(nextTheme);
    scene.setTheme(nextTheme);
    scene.render();
    if (snapshot) shell.setReadout(formatReadout(snapshot, shell.getMode()));
    shell.setStatus(nextTheme === 'dark' ? '夜间主题已开启' : '白天主题已开启');
  };

  shell.modeButton.addEventListener('click', onModeToggle);
  shell.themeButton.addEventListener('click', onThemeToggle);
  lifecycle.onDispose(() => shell.modeButton.removeEventListener('click', onModeToggle));
  lifecycle.onDispose(() => shell.themeButton.removeEventListener('click', onThemeToggle));

  const onResize = () => {
    scene.resize();
    scene.render();
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  lifecycle.onDispose(() => window.removeEventListener('resize', onResize));
  lifecycle.onDispose(() => window.visualViewport?.removeEventListener('resize', onResize));

  const onBeforeUnload = () => lifecycle.dispose();
  window.addEventListener('beforeunload', onBeforeUnload);
  lifecycle.onDispose(() => window.removeEventListener('beforeunload', onBeforeUnload));

  scene.init();
  scene.resize();
  scene.render();
  shell.setStatus('就绪');
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const renderer = resolveRenderer(window.location.search);
  if (renderer === 'experimental') {
    bootModern(mount);
    return;
  }
  bootLegacy(mount);
}

boot();
