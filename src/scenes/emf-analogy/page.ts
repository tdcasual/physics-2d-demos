import '../../ui/teaching-demo.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSceneShell } from '../../app/scene-shell';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createEmfAnalogyControls } from './controls';
import { createEmfAnalogyScene } from './scene.entry';
import type { EmfAnalogySnapshot } from './scene.sim';

function formatReadout(snapshot: EmfAnalogySnapshot, mode: 'normal' | 'presentation'): ReadoutItem[] {
  return [
    { label: '显示模式', value: mode === 'presentation' ? '演示模式' : '标准模式' },
    { label: '系统状态', value: snapshot.state.isSystemOn ? '通路' : '断路' },
    { label: '开度', value: `${Math.round(snapshot.state.tapOpening * 100)}%` },
    { label: '电流 I', value: `${snapshot.state.currentI.toFixed(2)} A` },
    { label: '内阻压降 Ir', value: `${snapshot.state.internalDrop.toFixed(2)} V` },
    { label: '路端电压 U', value: `${snapshot.state.terminalVoltage.toFixed(2)} V` }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '电路水流类比模型（2D）',
    subtitle: '通过开关与开度观察 I、Ir、U 的联动变化',
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let snapshot: EmfAnalogySnapshot | null = null;
  let isPlaying = false;

  const scene = createEmfAnalogyScene({
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

  const controls = createEmfAnalogyControls({
    container: shell.controlSlot,
    onSetSystemOn: (on) => {
      scene.setSystemOn(on);
      if (on) {
        transport.play();
        isPlaying = true;
      } else {
        transport.pause();
        isPlaying = false;
      }
      scene.render();
    },
    onSetTapOpening: (opening) => {
      scene.setTapOpening(opening);
      transport.play();
      isPlaying = true;
      scene.render();
    },
    onReset: () => {
      transport.reset();
      isPlaying = false;
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

  if (isPlaying) {
    transport.play();
  }
}

boot();
