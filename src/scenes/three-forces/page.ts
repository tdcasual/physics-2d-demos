import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createThreeForcesScene } from './scene.entry';
import { threeForcesMeta } from './scene.meta';
import { threeForcesControlsSchema } from './controls-schema';
import {
  parseThreeForcesTab,
  pointerToBaseNorm,
  stageLayoutFrom,
  type ThreeForcesHandle,
  type ThreeForcesParams,
  type ThreeForcesTab
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
  meta: threeForcesMeta,
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
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('three-forces requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createThreeForcesScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: ThreeForcesHandle = null;
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
        const p = scene.getParams();
        if (p.tab === 'spring') {
          writeOwnedSceneParams(sceneWriter, { springX: p.springX });
        }
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
    const forceScene = scene as ReturnType<typeof createThreeForcesScene>;
    let applying = false;
    let last = forceScene.getParams();

    const applyVisibility = (tab: ThreeForcesTab): void => {
      renderer.setVisible('弹簧', tab === 'spring');
      renderer.setVisible('inclineAngle', tab !== 'spring');
      renderer.setVisible('mu', tab !== 'spring');
    };

    const renderer = renderSchema({
      mount,
      schema: threeForcesControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'tab') {
          const tab = parseThreeForcesTab(value, 'gravity');
          forceScene.setParams({ tab });
          renderer.setActive(key, tab);
          applyVisibility(tab);
        } else if (key === 'autoRun' || key === 'showComponents') {
          forceScene.setParams({
            [key]: asBoolean(value)
          } as Partial<ThreeForcesParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          forceScene.setParams({
            [key]: number
          } as Partial<ThreeForcesParams>);
        }
        last = forceScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    applyVisibility(last.tab);

    const unsubscribe = forceScene.subscribe(() => {
      const p = forceScene.getParams();
      applying = true;
      if (p.mass !== last.mass) renderer.setValue('mass', p.mass);
      if (p.inclineAngle !== last.inclineAngle) {
        renderer.setValue('inclineAngle', p.inclineAngle);
      }
      if (p.mu !== last.mu) renderer.setValue('mu', p.mu);
      if (p.springK !== last.springK) renderer.setValue('springK', p.springK);
      if (p.springX !== last.springX) renderer.setValue('springX', p.springX);
      if (p.autoRun !== last.autoRun) renderer.setValue('autoRun', p.autoRun);
      if (p.showComponents !== last.showComponents) {
        renderer.setValue('showComponents', p.showComponents);
      }
      if (p.tab !== last.tab) {
        renderer.setActive('tab', p.tab);
        applyVisibility(p.tab);
      }
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
    activeKeys: ['tab'],
    applyParam: (key, value, ctx) => {
      if (key === 'tab') {
        const tab = parseThreeForcesTab(value, 'gravity');
        ctx.scene.setParams({ tab });
        ctx.setControlActive('tab', tab);
        return true;
      }
      if (key === 'autoRun' || key === 'showComponents') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<ThreeForcesParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (
        key === 'mass' ||
        key === 'inclineAngle' ||
        key === 'mu' ||
        key === 'springK' ||
        key === 'springX'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ThreeForcesParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    },
    afterApply: (ctx) => {
      const tab = parseThreeForcesTab(
        (ctx.scene as ReturnType<typeof createThreeForcesScene>).getParams()
          .tab,
        'gravity'
      );
      ctx.setControlActive('tab', tab);
    }
  }
});
