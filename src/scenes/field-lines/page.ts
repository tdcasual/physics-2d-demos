import { bootScenePage, type SceneInstance } from '../../app/scene-bootstrapper';
import type { ReadoutItem, Theme } from '../../app/layouts/types';
import type { TeachingMode } from '../../app/teaching-standards';
import { applyTouchInteractionMode } from '../../app/touch-interaction';
import { fieldLinesMeta } from './scene.meta';
import { createFieldLinesScene } from './scene.entry';
import { createFieldLinesControlsV4 } from './controls-v4';
import type { FieldLinesSnapshot } from './scene.sim';

function sceneLabel(scene: FieldLinesSnapshot['params']['scene']): string {
  if (scene === 'single') return '单个电荷';
  if (scene === 'like') return '同种电荷';
  if (scene === 'unlike') return '异种电荷';
  return '自定义双电荷';
}

function themeLabel(theme: Theme): string {
  return theme === 'dark' ? '夜间' : '白天';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function formatReadout(
  snapshot: FieldLinesSnapshot,
  mode: TeachingMode,
  theme: Theme
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

bootScenePage({
  meta: fieldLinesMeta,
  createScene: ({ canvas, theme, mode }) => {
    applyTouchInteractionMode(canvas, 'drag');

    const scene = createFieldLinesScene({
      canvas,
      mode,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;
    let currentTheme = theme as Theme;

    // 拖拽交互
    let draggingIndex: number | null = null;
    const toNorm = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) / Math.max(1, rect.height);
      return { x, y };
    };

    const onPointerDown = (event: PointerEvent) => {
      const point = toNorm(event);
      draggingIndex = scene.pickCharge(point.x, point.y);
      if (draggingIndex !== null) {
        canvas.setPointerCapture(event.pointerId);
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
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // no-op
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    const originalDispose = scene.dispose.bind(scene);

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), currentMode, currentTheme);
      },
      setMode(m: 'normal' | 'presentation') {
        currentMode = m;
        scene.setMode(m);
      },
      setTheme(t: Theme) {
        currentTheme = t;
        scene.setTheme(t);
      },
      dispose() {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        originalDispose();
      }
    } as SceneInstance;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createFieldLinesControlsV4({
      mount,
      onSetScene: (nextScene: string) => {
        (scene as unknown as { setScene(s: string): void }).setScene(nextScene);
        scene.render();
      },
      onSetDensity: (density) => {
        (scene as unknown as { setDensity(v: number): void }).setDensity(density);
        scene.render();
      },
      onSetCustomCharges: (q1, q2) => {
        (scene as unknown as { setCustomCharges(q1: number, q2: number): void }).setCustomCharges(q1, q2);
        scene.render();
      },
      onAddCharge: (q) => {
        (scene as unknown as { addCharge(q: number): void }).addCharge(q);
        scene.render();
        onStatus?.(q > 0 ? '添加正电荷' : '添加负电荷');
      },
      onRemoveCharge: (index) => {
        const snap = (scene as unknown as { getSnapshot(): FieldLinesSnapshot }).getSnapshot();
        const charges = snap.charges;
        const removeIndex = index === -1 ? charges.length - 1 : index;
        (scene as unknown as { removeCharge(i: number): void }).removeCharge(removeIndex);
        scene.render();
        onStatus?.('移除电荷');
      },
      onReset: () => {
        scene.reset?.();
        scene.render();
        onStatus?.('已重置场景');
      },
      onStatus
    });
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.28,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
