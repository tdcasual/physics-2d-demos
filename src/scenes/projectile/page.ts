import '../../ui/teaching-demo.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createProjectileScene } from './scene.entry';
import { createProjectileControls } from './controls';
import type { ProjectileParams, ProjectileState, ResolvedProjectileParams } from './scene.sim';

function formatReadout(state: ProjectileState, params: ResolvedProjectileParams): ReadoutItem[] {
  return [
    { label: '时间 t', value: `${state.t.toFixed(2)} s` },
    { label: '位移 x', value: `${state.x.toFixed(2)} m` },
    { label: '高度 y', value: `${state.y.toFixed(2)} m` },
    { label: '速度 vx', value: `${state.vx.toFixed(2)} m/s` },
    { label: '速度 vy', value: `${state.vy.toFixed(2)} m/s` },
    { label: '参数 v0/θ', value: `${params.speed.toFixed(1)} / ${params.angleDeg.toFixed(1)}` },
    { label: '参数 g/h0', value: `${params.gravity.toFixed(2)} / ${params.initialHeight.toFixed(1)}` },
    { label: '风/阻力', value: `${params.windAccel.toFixed(1)} / ${params.drag.toFixed(3)}` }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '抛体运动',
    subtitle: '统一教学页面规范：左数据区，右动画演示区',
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let currentParams: ResolvedProjectileParams = {
    speed: 18,
    angleDeg: 45,
    gravity: 9.8,
    initialHeight: 0,
    windAccel: 0,
    drag: 0
  };

  const scene = createProjectileScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    theme: shell.getTheme(),
    onReadout: (state) => shell.setReadout(formatReadout(state, currentParams))
  });
  currentParams = scene.getParams();

  const transport = createSceneShell({
    stepSeconds: 1 / 60,
    maxSubSteps: 5,
    onStep: (dt) => scene.step(dt),
    onRender: () => scene.render()
  });
  lifecycle.onDispose(() => transport.dispose());
  lifecycle.onDispose(() => scene.dispose());

  const controls = createProjectileControls({
    container: shell.controlSlot,
    initialParams: currentParams,
    onPlay: () => {
      transport.play();
      shell.setStatus('播放中');
    },
    onPause: () => {
      transport.pause();
      shell.setStatus('已暂停');
    },
    onReset: () => {
      transport.reset();
      scene.reset();
      scene.render();
      shell.setStatus('已重置');
    },
    onStep: () => {
      transport.stepOnce(() => {
        scene.step(1 / 60);
      });
      shell.setStatus('单步执行');
    },
    onApplyParams: (next: Partial<ProjectileParams>) => {
      currentParams = scene.setParams(next);
      transport.reset();
      scene.reset();
      scene.render();
    },
    onStatus: (text) => {
      shell.setStatus(text);
    }
  });
  lifecycle.onDispose(() => controls.dispose());

  const onModeToggle = () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    scene.setMode(nextMode);
    scene.resize();
    scene.render();
    shell.setStatus(nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启');
  };

  const onThemeToggle = () => {
    const nextTheme = shell.getTheme() === 'dark' ? 'light' : 'dark';
    shell.setTheme(nextTheme);
    scene.setTheme(nextTheme);
    scene.render();
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

  let dprQuery: MediaQueryList | null = null;

  const handleDprChange = () => {
    bindDprQuery();
    onResize();
  };

  const bindDprQuery = () => {
    if (typeof window.matchMedia !== 'function') return;
    if (dprQuery) {
      dprQuery.removeEventListener('change', handleDprChange);
    }
    const currentDpr = window.devicePixelRatio || 1;
    dprQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    dprQuery.addEventListener('change', handleDprChange);
  };

  bindDprQuery();
  lifecycle.onDispose(() => dprQuery?.removeEventListener('change', handleDprChange));

  const onBeforeUnload = () => lifecycle.dispose();
  window.addEventListener('beforeunload', onBeforeUnload);
  lifecycle.onDispose(() => window.removeEventListener('beforeunload', onBeforeUnload));

  scene.init();
  scene.resize();
  scene.render();
  shell.setStatus('就绪');
}

boot();
