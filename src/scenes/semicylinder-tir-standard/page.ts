import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { semicylinderStandardControlsSchema } from './controls-schema';
import { createSemicylinderStandardScene } from './scene.entry';
import { semicylinderStandardMeta } from './scene.meta';
import type { SemicylinderStandardParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const materialValues: Record<string, number> = {
  water: 1.33,
  glass: 1.52,
  diamond: 2.42
};

bootScenePage({
  meta: semicylinderStandardMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '光路数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('semicylinder-tir-standard requires a canvas');
    const scene = createSemicylinderStandardScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: semicylinderStandardControlsSchema,
      onChange: (key, value) => {
        if (key === 'material') {
          const n = materialValues[String(value)];
          if (n) {
            scene.setParams({ refractiveIndex: n });
            renderer.setValue('refractiveIndex', n);
          }
        } else if (key === 'showNormal' || key === 'autoRun')
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<SemicylinderStandardParams>);
        else
          scene.setParams({
            [key]: Number(value)
          } as Partial<SemicylinderStandardParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'critical') {
          const s = scene.getState();
          scene.setParams({ incidentAngle: s.criticalAngle, autoRun: true });
          renderer.setValue('incidentAngle', s.criticalAngle);
        } else if (key === 'reset') {
          scene.reset();
          renderer.setActive('material', 'glass');
          renderer.setValue('refractiveIndex', 1.5);
          renderer.setValue('incidentAngle', 27);
          renderer.setValue('showNormal', true);
          renderer.setValue('autoRun', true);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'showNormal' || key === 'autoRun') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<SemicylinderStandardParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<SemicylinderStandardParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
