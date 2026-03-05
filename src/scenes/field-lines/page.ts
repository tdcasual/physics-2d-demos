import '../../ui/teaching-demo.css';
import { bootLegacy2DBridgePage } from '../../app/legacy-2d-bridge-page';
import { createPageLifecycle } from '../../app/page-lifecycle';
import {
  createTeachingDemoShell,
  type ReadoutItem,
  type TeachingTheme
} from '../../app/teaching-demo-shell';
import { applyTouchInteractionMode } from '../../app/touch-interaction';
import { createFieldLinesControls } from './controls';
import { createFieldLinesScene } from './scene.entry';
import type { FieldLinesSnapshot } from './scene.sim';
import type { TeachingMode } from '../../app/teaching-standards';

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

function sceneLabel(scene: FieldLinesSnapshot['params']['scene']): string {
  if (scene === 'single') return '单个电荷';
  if (scene === 'like') return '同种电荷';
  if (scene === 'unlike') return '异种电荷';
  return '自定义双电荷';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function themeLabel(theme: TeachingTheme): string {
  return theme === 'dark' ? '夜间' : '白天';
}

function formatReadout(
  snapshot: FieldLinesSnapshot,
  mode: TeachingMode,
  theme: TeachingTheme
): ReadoutItem[] {
  return [
    { label: '场景', value: sceneLabel(snapshot.params.scene) },
    { label: '主题', value: themeLabel(theme) },
    { label: '显示模式', value: modeLabel(mode) },
    { label: '矢量密度', value: String(Math.round(snapshot.params.density)) },
    { label: '电荷数量', value: String(snapshot.charges.length) },
    {
      label: '电荷1',
      value: snapshot.charges[0]
        ? `${snapshot.charges[0].q > 0 ? '+' : ''}${snapshot.charges[0].q.toFixed(1)}`
        : '--'
    },
    {
      label: '电荷2',
      value: `${snapshot.params.q2 > 0 ? '+' : ''}${snapshot.params.q2.toFixed(1)}`
    }
  ];
}

function bootLegacy(mount: HTMLElement): void {
  bootLegacy2DBridgePage({
    mount,
    title: '电场线演化',
    subtitle: '右侧使用历史场景渲染，保持显示一致',
    scene: {
      sceneId: 'legacy-field-lines',
      sourcePath: '/animations/electromagnetism/模拟电场线.html'
    },
    setupControls: ({ shell, adapter, lifecycle }) => {
      const controls = createFieldLinesControls({
        container: shell.controlSlot,
        onSetScene: (scene) => adapter.sendControlExt('set-scene', { scene }),
        onSetDensity: (density) =>
          adapter.sendControlExt('set-density', { density }),
        onSetCustomCharges: (q1, q2) =>
          adapter.sendControlExt('set-custom-charges', { q1, q2 }),
        onReset: () => adapter.sendControl('reset'),
        onStatus: (text) => shell.setStatus(text)
      });
      lifecycle.onDispose(() => controls.dispose());
      shell.setStatus('左侧可调场景、密度与电荷参数');
    }
  });
}

function bootModern(mount: HTMLElement): void {
  const shell = createTeachingDemoShell({
    mount,
    title: '电场线演化',
    subtitle: '支持场景切换、密度调节与电荷拖拽',
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  let snapshot: FieldLinesSnapshot | null = null;

  const scene = createFieldLinesScene({
    canvas: shell.stageCanvas,
    mode: shell.getMode(),
    theme: shell.getTheme(),
    onReadout: (next) => {
      snapshot = next;
      shell.setReadout(formatReadout(next, shell.getMode(), shell.getTheme()));
    }
  });
  lifecycle.onDispose(() => scene.dispose());
  applyTouchInteractionMode(shell.stageCanvas, 'drag');

  const controls = createFieldLinesControls({
    container: shell.controlSlot,
    onSetScene: (nextScene) => {
      scene.setScene(nextScene);
      scene.render();
    },
    onSetDensity: (density) => {
      scene.setDensity(density);
      scene.render();
    },
    onSetCustomCharges: (q1, q2) => {
      scene.setCustomCharges(q1, q2);
      scene.render();
    },
    onReset: () => {
      scene.reset();
      scene.render();
      shell.setStatus('已重置场景');
    },
    onStatus: (text) => shell.setStatus(text)
  });
  lifecycle.onDispose(() => controls.dispose());

  let draggingIndex: number | null = null;

  const toNorm = (event: PointerEvent): { x: number; y: number } => {
    const rect = shell.stageCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) / Math.max(1, rect.height);
    return { x, y };
  };

  const onPointerDown = (event: PointerEvent) => {
    const point = toNorm(event);
    draggingIndex = scene.pickCharge(point.x, point.y);
    if (draggingIndex !== null) {
      shell.stageCanvas.setPointerCapture(event.pointerId);
      shell.setStatus('拖拽中');
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (draggingIndex === null) return;
    const point = toNorm(event);
    scene.moveCharge(draggingIndex, point.x, point.y);
    scene.render();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (draggingIndex !== null) {
      draggingIndex = null;
      try {
        shell.stageCanvas.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
      shell.setStatus('拖拽完成');
    }
  };

  shell.stageCanvas.addEventListener('pointerdown', onPointerDown);
  shell.stageCanvas.addEventListener('pointermove', onPointerMove);
  shell.stageCanvas.addEventListener('pointerup', onPointerUp);
  shell.stageCanvas.addEventListener('pointercancel', onPointerUp);
  lifecycle.onDispose(() =>
    shell.stageCanvas.removeEventListener('pointerdown', onPointerDown)
  );
  lifecycle.onDispose(() =>
    shell.stageCanvas.removeEventListener('pointermove', onPointerMove)
  );
  lifecycle.onDispose(() =>
    shell.stageCanvas.removeEventListener('pointerup', onPointerUp)
  );
  lifecycle.onDispose(() =>
    shell.stageCanvas.removeEventListener('pointercancel', onPointerUp)
  );

  const onModeToggle = () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    scene.setMode(nextMode);
    scene.resize();
    scene.render();
    if (snapshot) {
      shell.setReadout(
        formatReadout(snapshot, shell.getMode(), shell.getTheme())
      );
    }
    shell.setStatus(
      nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启'
    );
  };

  const onThemeToggle = () => {
    const nextTheme = shell.getTheme() === 'dark' ? 'light' : 'dark';
    shell.setTheme(nextTheme);
    scene.setTheme(nextTheme);
    scene.render();
    if (snapshot) {
      shell.setReadout(
        formatReadout(snapshot, shell.getMode(), shell.getTheme())
      );
    }
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
  shell.setStatus('就绪，可拖拽电荷观察场线变化');

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
