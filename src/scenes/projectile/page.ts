import '../../ui/teaching-demo.css';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createControlPanel } from '../../ui/control-panel';
import { createProjectileScene } from './scene.entry';
import type { ProjectileState } from './scene.sim';

function formatReadout(state: ProjectileState): ReadoutItem[] {
  return [
    { label: '时间 t', value: `${state.t.toFixed(2)} s` },
    { label: '位移 x', value: `${state.x.toFixed(2)} m` },
    { label: '高度 y', value: `${state.y.toFixed(2)} m` },
    { label: '速度 vx', value: `${state.vx.toFixed(2)} m/s` },
    { label: '速度 vy', value: `${state.vy.toFixed(2)} m/s` }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '抛体运动（2D）',
    subtitle: '统一教学页面规范：左数据区，右动画演示区',
    defaultMode: 'normal'
  });

  const scene = createProjectileScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    onReadout: (state) => shell.setReadout(formatReadout(state))
  });

  const transport = createSceneShell({
    stepSeconds: 1 / 60,
    maxSubSteps: 5,
    onStep: (dt) => scene.step(dt),
    onRender: () => scene.render()
  });

  createControlPanel(shell.controlSlot, {
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
      shell.setStatus('已重置');
    },
    onStep: () => {
      transport.stepOnce(() => {
        scene.step(1 / 60);
      });
      shell.setStatus('单步执行');
    }
  });

  shell.modeButton.addEventListener('click', () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    scene.setMode(nextMode);
    scene.resize();
    scene.render();
    shell.setStatus(nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启');
  });

  const onResize = () => {
    scene.resize();
    scene.render();
  };

  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);

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

  scene.init();
  scene.resize();
  scene.render();
  shell.setStatus('就绪');
}

boot();
