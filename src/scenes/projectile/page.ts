import '../../ui/teaching-demo.css';
import '../../ui/teaching-demo-v2.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createProjectileScene } from './scene.entry';
import { createProjectileControlsV3 } from './controls-v3';
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
    subtitle: 'Projectile Motion',
    defaultMode: 'normal',
    hideHeader: true,
    readoutLabel: '数据区',
    layout: {
      defaultLeftRatio: 0.32,
      leftMinWidth: 260,
      leftMaxWidth: 960,
      hasGraph: false,
      controlColumns: 'auto',
      readoutCollapsed: true,
    }
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

  // V3 控制面板
  const controls = createProjectileControlsV3({
    mount: shell.controlSlot,
    onParamChange: (key, value) => {
      const paramMap: Record<string, keyof ProjectileParams> = {
        'v0': 'speed',
        'theta': 'angleDeg',
        'h0': 'initialHeight',
        'g': 'gravity',
        'c': 'drag'
      };
      const paramKey = paramMap[key];
      if (paramKey) {
        currentParams = scene.setParams({ [paramKey]: value });
        shell.setReadout(formatReadout(scene.getState(), currentParams));
      }
    },
    onPresetSelect: (preset) => {
      let params: Partial<ProjectileParams> = {};
      switch (preset) {
        case 'earth': params = { gravity: 9.8, windAccel: 0 }; break;
        case 'moon': params = { gravity: 1.62, windAccel: 0 }; break;
        case 'mars': params = { gravity: 3.71, windAccel: 0 }; break;
        case 'wind': params = { windAccel: 2.0 }; break;
      }
      currentParams = scene.setParams(params);
      controls.setParam('g', currentParams.gravity);
      controls.updatePreset(preset);
      transport.reset();
      scene.reset();
      scene.render();
      shell.setReadout(formatReadout(scene.getState(), currentParams));
    }
  });

  // 浮动控制按钮
  const floatingControls = document.createElement('div');
  floatingControls.className = 'stage-floating-controls';
  floatingControls.innerHTML = `
    <button type="button" data-action="play" title="播放">▶</button>
    <button type="button" data-action="pause" title="暂停">⏸</button>
    <button type="button" data-action="reset" title="重置">⏹</button>
    <button type="button" data-action="step" title="单步">⏵</button>
  `;
  shell.stageSlot.appendChild(floatingControls);

  floatingControls.querySelector('[data-action="play"]')?.addEventListener('click', () => {
    transport.play();
    shell.setStatus('播放中');
  });
  floatingControls.querySelector('[data-action="pause"]')?.addEventListener('click', () => {
    transport.pause();
    shell.setStatus('已暂停');
  });
  floatingControls.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    transport.reset();
    scene.reset();
    scene.render();
    shell.setStatus('已重置');
  });
  floatingControls.querySelector('[data-action="step"]')?.addEventListener('click', () => {
    transport.stepOnce(() => scene.step(1 / 60));
    shell.setStatus('已单步推进');
  });

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
  lifecycle.onDispose(() => window.removeEventListener('resize', onResize));

  scene.init();
  scene.resize();
  scene.render();
  
  controls.setParam('v0', currentParams.speed);
  controls.setParam('theta', currentParams.angleDeg);
  controls.setParam('h0', currentParams.initialHeight);
  controls.setParam('g', currentParams.gravity);
  controls.setParam('c', currentParams.drag);
  
  shell.setStatus('就绪');
}

boot();
