import '../../ui/teaching-demo.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createChaseMeetControls } from './controls';
import { createChaseMeetScene } from './scene.entry';
import type { ChaseMeetSnapshot, ResolvedChaseMeetParams } from './scene.sim';

function formatReadout(
  snapshot: ChaseMeetSnapshot,
  mode: 'normal' | 'presentation',
  isPlaying: boolean
): ReadoutItem[] {
  return [
    { label: '显示模式', value: mode === 'presentation' ? '演示模式' : '标准模式' },
    { label: '动画状态', value: isPlaying ? '运行中' : '已暂停' },
    { label: '当前时间', value: `${snapshot.state.t.toFixed(2)} s` },
    { label: '当前距离', value: `${snapshot.state.distance.toFixed(2)} m` },
    { label: '相遇信息', value: snapshot.state.meetMessage },
    { label: 'T / Δt', value: `${snapshot.params.totalTime.toFixed(2)} / ${snapshot.params.dt.toFixed(3)}` },
    { label: 'vA(t)', value: snapshot.params.vExprA },
    { label: 'vB(t)', value: snapshot.params.vExprB }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '追及相遇演示动画（2D）',
    subtitle: '一维追及场景：上方位移演示，下方 x-t / v-t 图像联动',
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let currentSnapshot: ChaseMeetSnapshot | null = null;
  let isPlaying = false;
  let currentParams: ResolvedChaseMeetParams | null = null;

  const scene = createChaseMeetScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    theme: shell.getTheme(),
    onReadout: (snapshot) => {
      currentSnapshot = snapshot;
      shell.setReadout(formatReadout(snapshot, shell.getMode(), isPlaying));
    }
  });
  lifecycle.onDispose(() => scene.dispose());
  currentParams = scene.getParams();

  const transport = createSceneShell({
    stepSeconds: 1 / 60,
    maxSubSteps: 5,
    onStep: (dt) => scene.step(dt),
    onRender: () => scene.render()
  });
  lifecycle.onDispose(() => transport.dispose());

  const controls = createChaseMeetControls({
    container: shell.controlSlot,
    initialParams: currentParams,
    onPlay: () => {
      transport.play();
      isPlaying = true;
      if (currentSnapshot) {
        shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
      }
      shell.setStatus('动画已开始');
    },
    onPause: () => {
      transport.pause();
      isPlaying = false;
      if (currentSnapshot) {
        shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
      }
      shell.setStatus('动画已暂停');
    },
    onReset: () => {
      transport.reset();
      isPlaying = false;
      scene.reset();
      scene.render();
      if (currentSnapshot) {
        shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
      }
      shell.setStatus('动画已重置');
    },
    onStep: () => {
      transport.stepOnce(() => {
        scene.step(1 / 60);
      });
      isPlaying = false;
      if (currentSnapshot) {
        shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
      }
      shell.setStatus('已单步推进');
    },
    onApplyParams: (next) => {
      currentParams = scene.setParams(next);
      transport.reset();
      isPlaying = false;
      scene.reset();
      scene.render();
      if (currentSnapshot) {
        shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
      }
      shell.setStatus('参数已更新');
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
    if (currentSnapshot) {
      shell.setReadout(formatReadout(currentSnapshot, shell.getMode(), isPlaying));
    }
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
