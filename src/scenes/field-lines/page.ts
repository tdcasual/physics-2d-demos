import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { fieldLinesMeta } from './scene.meta';
import { createFieldLinesScene } from './scene.entry';
import { fieldLinesControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { PROBE_N_DEFAULT, type FieldLinesScene } from './scene.sim';

function sceneLabel(scene: FieldLinesScene): string {
  if (scene === 'single') return '单个电荷';
  if (scene === 'like') return '同种电荷';
  if (scene === 'unlike') return '异种电荷';
  return '自定义双电荷';
}

bootScenePage({
  meta: fieldLinesMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('field-lines requires a canvas render surface');
    applyTouchInteractionMode(canvas, 'drag');

    const scene = createFieldLinesScene({
      canvas,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    // 拖拽交互
    // 拖拽合帧：pointermove 一帧可派发多次，rAF 合帧避免重复全量重绘。
    // 该交互在 createScene 层（非 createControls），故本地创建 scheduler
    // 并随场景 dispose 收口。
    const dragRenderScheduler = createRenderScheduler(() => scene.render());
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
      dragRenderScheduler.schedule();
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
      dispose() {
        dragRenderScheduler.dispose();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        originalDispose();
      }
    };
  },
  createControls: ({
    mount,
    scene,
    onStatus,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const renderer = renderSchema({
      mount,
      schema: fieldLinesControlsSchema,
      onChange: (key, value) => {
        if (key === 'n') {
          scene.setN(value as number);
          scheduleRender();
          writeParam(key, value);
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
          scheduleRender();
          onStatus?.(sceneLabel(key as FieldLinesScene) + '电场');
        } else if (key === 'add-positive') {
          scene.addCharge(1);
          scheduleRender();
          onStatus?.('添加正电荷');
        } else if (key === 'add-negative') {
          scene.addCharge(-1);
          scheduleRender();
          onStatus?.('添加负电荷');
        } else if (key === 'remove') {
          const snap = scene.getSnapshot();
          const removeIndex = snap.charges.length - 1;
          scene.removeCharge(removeIndex);
          scheduleRender();
          onStatus?.('移除电荷');
        } else if (key === 'apply-charges') {
          const q1 = renderer.getValue<number>('q1') ?? 1;
          const q2 = renderer.getValue<number>('q2') ?? -1;
          scene.setCustomCharges(q1, q2);
          scheduleRender();
          onStatus?.(`设置电荷 Q₁=${q1}, Q₂=${q2}`);
        } else if (key === 'reset') {
          scene.reset?.();
          renderer.setValue('n', PROBE_N_DEFAULT);
          scheduleRender();
          onStatus?.('已重置场景');
        }
      }
    });

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
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
