import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createSingleSlitScene } from './scene.entry';
import { singleSlitMeta } from './scene.meta';
import { singleSlitControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type SingleSlitHandle,
  type SingleSlitParams
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: singleSlitMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 280,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('single-slit requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createSingleSlitScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: SingleSlitHandle = null;
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
      if (dragHandle) {
        scene.moveHandle(dragHandle, point.x, point.y);
        canvas.setPointerCapture(event.pointerId);
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!dragHandle) return;
      const point = toNorm(event);
      scene.moveHandle(dragHandle, point.x, point.y);
      scheduler.schedule();
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (dragHandle) {
        writeSceneParams({
          detectorX: scene.getParams().detectorX,
          autoScan: scene.getParams().autoScan ? 1 : 0
        });
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
    const slitScene = scene as ReturnType<typeof createSingleSlitScene>;
    let applying = false;
    let last = slitScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: singleSlitControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'autoScan') {
          slitScene.setParams({ autoScan: asBoolean(value) });
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          slitScene.setParams({
            [key]: number
          } as Partial<SingleSlitParams>);
        }
        last = slitScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = slitScene.subscribe(() => {
      const p = slitScene.getParams();
      applying = true;
      if (p.detectorX !== last.detectorX) {
        renderer.setValue('detectorX', p.detectorX);
      }
      if (p.lambda !== last.lambda) renderer.setValue('lambda', p.lambda);
      if (p.slitWidth !== last.slitWidth) {
        renderer.setValue('slitWidth', p.slitWidth);
      }
      if (p.distance !== last.distance) {
        renderer.setValue('distance', p.distance);
      }
      if (p.autoScan !== last.autoScan)
        renderer.setValue('autoScan', p.autoScan);
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
    applyParam: (key, value, ctx) => {
      if (key === 'autoScan') {
        const on = asBoolean(value);
        ctx.scene.setParams({ autoScan: on });
        ctx.setControlValue(key, on);
        return true;
      }
      if (
        key === 'lambda' ||
        key === 'slitWidth' ||
        key === 'distance' ||
        key === 'detectorX'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<SingleSlitParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
