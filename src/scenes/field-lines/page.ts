import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem, Theme } from '../../app/layouts/types';
import type { TeachingMode } from '../../platform/standards';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { createSceneListener } from '../../app/scene-listener';
import { fieldLinesMeta } from './scene.meta';
import { createFieldLinesScene } from './scene.entry';
import { fieldLinesControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { FieldLinesSnapshot, FieldLinesScene } from './scene.sim';

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
  createScene: ({ canvas, theme, mode, demoHints }) => {
    applyTouchInteractionMode(canvas, 'drag');

    const scene = createFieldLinesScene({
      canvas,
      mode,
      demoHints,
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
    const { subscribe, notify } = createSceneListener();

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), currentMode, currentTheme);
      },
      subscribe,
      setMode(m: 'normal' | 'presentation', hints?: unknown) {
        currentMode = m;
        scene.setMode(m, hints as Parameters<typeof scene.setMode>[1]);
        notify();
      },
      setTheme(t: Theme) {
        currentTheme = t;
        scene.setTheme(t);
        notify();
      },
      dispose() {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        originalDispose();
      }
    };
  },
  createControls: ({ mount, scene, onStatus }) => {
    const renderer = renderSchema({
      mount,
      schema: fieldLinesControlsSchema,
      onChange: (key, value) => {
        if (key === 'density') {
          scene.setDensity(value as number);
          scene.render();
        } else if (key === 'q1' || key === 'q2') {
          // Values are updated in the input; apply happens via button
        }
      },
      onAction: (key) => {
        if (
          key === 'single' ||
          key === 'like' ||
          key === 'unlike' ||
          key === 'custom'
        ) {
          scene.setScene(key as FieldLinesScene);
          scene.render();
          onStatus?.(
            sceneLabel(key as FieldLinesSnapshot['params']['scene']) + '电场'
          );
        } else if (key === 'add-positive') {
          scene.addCharge(1);
          scene.render();
          onStatus?.('添加正电荷');
        } else if (key === 'add-negative') {
          scene.addCharge(-1);
          scene.render();
          onStatus?.('添加负电荷');
        } else if (key === 'remove') {
          const snap = scene.getSnapshot();
          const removeIndex = snap.charges.length - 1;
          scene.removeCharge(removeIndex);
          scene.render();
          onStatus?.('移除电荷');
        } else if (key === 'apply-charges') {
          const q1 = renderer.getValue<number>('q1') ?? 1;
          const q2 = renderer.getValue<number>('q2') ?? -1;
          scene.setCustomCharges(q1, q2);
          scene.render();
          onStatus?.(`设置电荷 Q₁=${q1}, Q₂=${q2}`);
        } else if (key === 'reset') {
          scene.reset?.();
          onStatus?.('已重置场景');
        }
      }
    });

    return {
      dispose: () => {
        renderer.dispose();
      }
    };
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.28,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
