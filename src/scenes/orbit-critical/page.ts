import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { OrbitCriticalParams } from './scene.sim';
import { orbitCriticalControlsSchema } from './controls-schema';
import { createOrbitCriticalScene } from './scene.entry';
import { orbitCriticalMeta } from './scene.meta';

bootScenePage({
  meta: orbitCriticalMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '实时数据看板',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('orbit-critical requires a canvas');
    const scene = createOrbitCriticalScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: orbitCriticalControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const model = String(value) as OrbitCriticalParams['model'];
          scene.setParams({ model });
          renderer.setActive(key, model);
        } else {
          scene.setParams({
            [key]:
              key === 'autoRun' || key === 'showVectors'
                ? Boolean(value)
                : Number(value)
          } as Partial<OrbitCriticalParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => render()
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'model') {
        const model = String(value) as OrbitCriticalParams['model'];
        if (!['rope', 'rod'].includes(model)) return false;
        ctx.scene.setParams({ model });
        ctx.setControlActive(key, model);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ [key]: enabled } as Partial<OrbitCriticalParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<OrbitCriticalParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
