import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createDynamicCircleScene } from './scene.entry';
import { dynamicCircleMeta } from './scene.meta';
import { dynamicCircleControlsSchema } from './controls-schema';
import type {
  DynamicCircleBoundary,
  DynamicCircleHandle,
  DynamicCircleParams,
  DynamicCircleTab
} from './scene.sim';

bootScenePage({
  meta: dynamicCircleMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('dynamic-circle requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createDynamicCircleScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: DynamicCircleHandle = null;
    const toNorm = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / Math.max(1, rect.width),
        y: (event.clientY - rect.top) / Math.max(1, rect.height)
      };
    };
    const onPointerDown = (event: PointerEvent): void => {
      const point = toNorm(event);
      dragHandle = scene.pickHandle(point.x, point.y);
      if (dragHandle) canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!dragHandle) return;
      const point = toNorm(event);
      scene.moveHandle(dragHandle, point.x, point.y);
      scheduler.schedule();
    };
    const onPointerUp = (event: PointerEvent): void => {
      dragHandle = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      dispose(): void {
        scheduler.dispose();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: dynamicCircleControlsSchema,
      onChange: (key, value) => {
        if (key === 'tab') {
          const params = scene.setTab(String(value) as DynamicCircleTab);
          renderer.setValue('v', params.v);
          renderer.setValue('theta', params.theta);
          renderer.setValue('y0', params.y0);
        } else if (key === 'boundary')
          scene.setBoundary(String(value) as DynamicCircleBoundary);
        else if (key === 'autoSweep' || key === 'showCenter') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<DynamicCircleParams>);
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<DynamicCircleParams>);
        }
        if (key === 'tab' || key === 'boundary')
          renderer.setActive(key, String(value));
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        renderer.dispose();
      }
    };
  }
});
