import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createVerticalCircleScene } from './scene.entry';
import { verticalCircleMeta } from './scene.meta';
import { verticalCircleControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type VerticalCircleHandle,
  type VerticalCircleParams
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

function parseModel(value: unknown): 'rope' | 'rod' | null {
  if (value === 'rod' || value === 1 || value === '1') return 'rod';
  if (value === 'rope' || value === 0 || value === '0') return 'rope';
  return null;
}

bootScenePage({
  meta: verticalCircleMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('vertical-circle requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createVerticalCircleScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: VerticalCircleHandle = null;
    const toNorm = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return pointerToBaseNorm(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        stageLayoutFrom(canvas)
      );
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
      if (dragHandle) {
        writeSceneParams({ theta: scene.getParams().theta });
      }
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
      step(dt: number): void {
        if (dragHandle) {
          scheduler.schedule();
          return;
        }
        scene.step(dt);
        scheduler.schedule();
      },
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
    const circleScene = scene as ReturnType<typeof createVerticalCircleScene>;
    let applying = false;
    let last = circleScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: verticalCircleControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'model') {
          const model = parseModel(value) ?? 'rope';
          circleScene.setParams({ model });
          renderer.setActive(key, model);
        } else if (
          key === 'autoRun' ||
          key === 'showVectors' ||
          key === 'showPath'
        ) {
          circleScene.setParams({
            [key]: asBoolean(value)
          } as Partial<VerticalCircleParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          circleScene.setParams({
            [key]: number
          } as Partial<VerticalCircleParams>);
        }
        last = circleScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = circleScene.subscribe(() => {
      const p = circleScene.getParams();
      applying = true;
      if (p.theta !== last.theta) renderer.setValue('theta', p.theta);
      if (p.vBottom !== last.vBottom) renderer.setValue('vBottom', p.vBottom);
      if (p.model !== last.model) renderer.setActive('model', p.model);
      applying = false;
      last = p;
    });

    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    activeKeys: ['model'],
    applyParam: (key, value, ctx) => {
      if (key === 'model') {
        const model = parseModel(value) ?? 'rope';
        ctx.scene.setParams({ model });
        ctx.setControlActive('model', model);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors' || key === 'showPath') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<VerticalCircleParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'vBottom' || key === 'theta') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<VerticalCircleParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
