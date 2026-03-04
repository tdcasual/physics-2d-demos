import '../../ui/teaching-demo.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createElectrificationControls } from './controls';
import { createElectrificationScene } from './scene.entry';
import type { ElectrificationSnapshot } from './scene.sim';

function sceneLabel(scene: ElectrificationSnapshot['state']['scene']): string {
  if (scene === 'friction') return '摩擦起电';
  if (scene === 'induction') return '感应起电';
  return '接触起电';
}

function formatReadout(snapshot: ElectrificationSnapshot, mode: 'normal' | 'presentation'): ReadoutItem[] {
  return [
    { label: '场景', value: sceneLabel(snapshot.state.scene) },
    { label: '显示模式', value: mode === 'presentation' ? '演示模式' : '标准模式' },
    { label: '下一步动作', value: snapshot.state.nextActionLabel },
    { label: '说明', value: snapshot.state.explanation }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '交互式静电起电演示（2D）',
    subtitle: '三类起电过程按步骤演示，可逐步执行',
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let snapshot: ElectrificationSnapshot | null = null;

  const scene = createElectrificationScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    theme: shell.getTheme(),
    onReadout: (next) => {
      snapshot = next;
      shell.setReadout(formatReadout(next, shell.getMode()));
    }
  });
  lifecycle.onDispose(() => scene.dispose());

  const controls = createElectrificationControls({
    container: shell.controlSlot,
    onSetScene: (nextScene) => {
      scene.setScene(nextScene);
      scene.render();
    },
    onRunStep: () => {
      scene.runSceneAction();
      scene.render();
    },
    onReset: () => {
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

  scene.init();
  scene.resize();
  scene.render();
  shell.setStatus('就绪，可执行下一步观察过程');

  const onBeforeUnload = () => lifecycle.dispose();
  window.addEventListener('beforeunload', onBeforeUnload);
  lifecycle.onDispose(() => window.removeEventListener('beforeunload', onBeforeUnload));
}

boot();
