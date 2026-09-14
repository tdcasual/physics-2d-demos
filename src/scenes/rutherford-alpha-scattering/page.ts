import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { RutherfordParams } from './scene.sim';
import { rutherfordControlsSchema } from './controls-schema';
import { createRutherfordScene } from './scene.entry';
import { rutherfordMeta } from './scene.meta';

const MODEL_IDS: Record<string, 0 | 1> = { plum: 0, nuclear: 1 };

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

function modelValue(value: unknown): 0 | 1 | null {
  if (value === 0 || value === '0' || value === 'plum') return 0;
  if (value === 1 || value === '1' || value === 'nuclear') return 1;
  return null;
}

bootScenePage({
  meta: rutherfordMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('rutherford-alpha-scattering requires a canvas');
    const scene = createRutherfordScene({ canvas, theme, mode, demoHints });
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
      schema: rutherfordControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const model = MODEL_IDS[String(value)];
          if (model === undefined) return;
          scene.setParams({ model });
          renderer.setActive('model', String(value));
        } else if (key === 'autoRun' || key === 'showForces') {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<RutherfordParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<RutherfordParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'fireBeam') scene.fireBeam();
        else if (key === 'toggleModel') {
          const model = scene.toggleModel();
          renderer.setActive('model', model === 1 ? 'nuclear' : 'plum');
        } else if (key === 'reset') scene.reset();
        render();
      }
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
        const model = modelValue(value);
        if (model === null) return false;
        ctx.scene.setParams({ model });
        ctx.setControlActive(key, model === 1 ? 'nuclear' : 'plum');
        return true;
      }
      if (key === 'autoRun' || key === 'showForces') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<RutherfordParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<RutherfordParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
