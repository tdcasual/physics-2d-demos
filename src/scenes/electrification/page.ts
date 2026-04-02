import '../../ui/teaching-demo.css';
import '../../ui/teaching-demo-v2.css';
import { bootLegacy2DBridgePage } from '../../app/legacy-2d-bridge-page';
import { createPageLifecycle } from '../../app/page-lifecycle';
import {
  createTeachingDemoShell,
  type ReadoutItem
} from '../../app/teaching-demo-shell';
import type { TeachingMode } from '../../app/teaching-standards';
import { createElectrificationControlsV3 } from './controls-v3';
import { createElectrificationScene } from './scene.entry';
import type { ElectrificationSnapshot } from './scene.sim';

type Renderer = 'legacy' | 'modern' | 'modern-lab' | 'experimental';

function resolveRenderer(search: string): Renderer {
  const query = new URLSearchParams(search);
  const renderer = query.get('renderer');
  if (renderer === 'legacy') {
    return 'legacy';
  }
  if (renderer === 'modern') {
    return 'modern';
  }
  if (renderer === 'modern-lab') {
    return 'modern-lab';
  }
  if (renderer === 'experimental') {
    return 'experimental';
  }
  return 'modern';
}

function sceneLabel(scene: ElectrificationSnapshot['state']['scene']): string {
  if (scene === 'friction') return '摩擦起电';
  if (scene === 'induction') return '感应起电';
  return '接触起电';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function formatReadout(
  snapshot: ElectrificationSnapshot,
  mode: TeachingMode
): ReadoutItem[] {
  return [
    { label: '场景', value: sceneLabel(snapshot.state.scene) },
    { label: '显示模式', value: modeLabel(mode) },
    { label: '下一步动作', value: snapshot.state.nextActionLabel },
    { label: '说明', value: snapshot.state.explanation }
  ];
}

function bootLegacy(mount: HTMLElement): void {
  bootLegacy2DBridgePage({
    mount,
    title: '静电起电演示',
    subtitle: '右侧使用历史场景渲染，保持显示一致',
    scene: {
      sceneId: 'legacy-electrification',
      sourcePath: '/animations/electromagnetism/起电方式演示.html'
    },
    setupControls: ({ shell, adapter, lifecycle }) => {
      const controls = createElectrificationControlsV3({
        mount: shell.controlSlot,
        onSetScene: (scene) => adapter.sendControlExt('set-scene', { scene }),
        onRunStep: () => adapter.sendControlExt('run-scene-action'),
        onReset: () => adapter.sendControl('reset'),
        onStatus: (text) => shell.setStatus(text)
      });
      lifecycle.onDispose(() => controls.dispose());
      shell.setStatus('左侧可切换起电场景并执行步骤');
    }
  });
}

function bootModern(mount: HTMLElement): void {
  const shell = createTeachingDemoShell({
    mount,
    title: '静电起电演示',
    subtitle: '三类起电过程按步骤演示，可逐步执行',
    defaultMode: 'normal',
    hideHeader: false,
    readoutLabel: '状态',
    layout: {
      defaultLeftRatio: 0.35,
      leftMinWidth: 280,
      leftMaxWidth: 960,
      hasGraph: false,
      controlColumns: 1,
      readoutCollapsed: false,
    }
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

  const controls = createElectrificationControlsV3({
    mount: shell.controlSlot,
    onSetScene: (nextScene: string) => {
      scene.setScene(nextScene as import('./scene.sim').ElectrificationScene);
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
    shell.setStatus(
      nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启'
    );
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
  lifecycle.onDispose(() =>
    shell.modeButton.removeEventListener('click', onModeToggle)
  );
  lifecycle.onDispose(() =>
    shell.themeButton.removeEventListener('click', onThemeToggle)
  );

  const onResize = () => {
    scene.resize();
    scene.render();
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  lifecycle.onDispose(() => window.removeEventListener('resize', onResize));
  lifecycle.onDispose(() =>
    window.visualViewport?.removeEventListener('resize', onResize)
  );

  scene.init();
  scene.resize();
  scene.render();
  shell.setStatus('就绪，可执行下一步观察过程');

  const onBeforeUnload = () => lifecycle.dispose();
  window.addEventListener('beforeunload', onBeforeUnload);
  lifecycle.onDispose(() =>
    window.removeEventListener('beforeunload', onBeforeUnload)
  );
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const query = new URLSearchParams(window.location.search);
  const renderer = resolveRenderer(window.location.search);
  const explicitModernCompat = query.get('renderer') === 'modern';
  if (renderer === 'legacy' || explicitModernCompat) {
    bootLegacy(mount);
    return;
  }
  bootModern(mount);
}

boot();
