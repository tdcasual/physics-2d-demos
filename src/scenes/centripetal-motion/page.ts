import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { centripetalControlsSchema } from './controls-schema';
import { centripetalMeta } from './scene.meta';
import { createCentripetalScene } from './scene.entry';
import type { CentripetalParams } from './scene.sim';

bootScenePage({
  meta: centripetalMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('centripetal-motion requires a canvas');
    const scene = createCentripetalScene({ canvas, theme, mode, demoHints });
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
    const renderer = renderSchema({
      mount,
      schema: centripetalControlsSchema,
      onChange: (key, value) => {
        if (key === 'mass' || key === 'radius' || key === 'angularVelocity') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<CentripetalParams>);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    const syncFromScene = (): void => {
      const params = scene.getParams();
      renderer.setValueSilently('mass', params.mass);
      renderer.setValueSilently('radius', params.radius);
      renderer.setValueSilently('angularVelocity', params.angularVelocity);
    };
    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mass' || key === 'radius' || key === 'angularVelocity') {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<CentripetalParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
