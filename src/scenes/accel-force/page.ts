import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createAccelForceScene } from './scene.entry';
import { accelForceMeta } from './scene.meta';
import { accelForceControlsSchema } from './controls-schema';
import { parseAccelForceMode, type AccelForceParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: accelForceMeta,
  autoPlay: true,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 480,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时数据',
    hasGraph: true,
    // Section chrome ~57px + 8px grid padding; keep axis titles in-slot.
    graphHeight: 236,
    graphMinHeight: 180,
    graphMaxHeight: 300,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('accel-force requires a canvas');
    const scene = createAccelForceScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const accelScene = scene as ReturnType<typeof createAccelForceScene>;
    let applying = false;
    let last = accelScene.getParams();

    const syncControls = (p: AccelForceParams): void => {
      renderer.setActive('mode', p.mode);
      renderer.setValue('cartMass', p.cartMass);
      renderer.setValue('hangerMass', p.hangerMass);
      renderer.setValue('balanced', p.balanced);
      renderer.setValue('autoRun', p.autoRun);
    };

    const renderer = renderSchema({
      mount,
      schema: accelForceControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'mode') {
          const mode = parseAccelForceMode(value, 'force');
          accelScene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'balanced' || key === 'autoRun') {
          accelScene.setParams({
            [key]: asBoolean(value)
          } as Partial<AccelForceParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          accelScene.setParams({
            [key]: number
          } as Partial<AccelForceParams>);
        }
        last = accelScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'release') accelScene.release();
        else if (key === 'resetCart') accelScene.resetCart();
        else if (key === 'record') accelScene.recordPoint();
        else if (key === 'clear') accelScene.clearRecords();
        else if (key === 'restart') {
          accelScene.reset();
          last = accelScene.getParams();
          applying = true;
          syncControls(last);
          applying = false;
        }
        last = accelScene.getParams();
        render();
      }
    });

    const unsubscribe = accelScene.subscribe(() => {
      const p = accelScene.getParams();
      applying = true;
      if (p.mode !== last.mode) renderer.setActive('mode', p.mode);
      if (p.cartMass !== last.cartMass) {
        renderer.setValue('cartMass', p.cartMass);
      }
      if (p.hangerMass !== last.hangerMass) {
        renderer.setValue('hangerMass', p.hangerMass);
      }
      if (p.balanced !== last.balanced) {
        renderer.setValue('balanced', p.balanced);
      }
      if (p.autoRun !== last.autoRun) renderer.setValue('autoRun', p.autoRun);
      applying = false;
      last = p;
    });

    return {
      ...exposeSchemaHandle(renderer),
      dispose: () => {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    activeKeys: ['mode'],
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = parseAccelForceMode(value, 'force');
        ctx.scene.setParams({ mode });
        ctx.setControlActive('mode', mode);
        return true;
      }
      if (key === 'balanced' || key === 'autoRun') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<AccelForceParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'cartMass' || key === 'hangerMass') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<AccelForceParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
