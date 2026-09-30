import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { inductionAcceleratorControlsSchema } from './controls-schema';
import { createInductionAcceleratorScene } from './scene.entry';
import { inductionAcceleratorMeta } from './scene.meta';
import type { InductionAcceleratorParams } from './scene.sim';
function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const booleanKeys = new Set(['showVectors', 'slowMode', 'autoRun']);
bootScenePage({
  meta: inductionAcceleratorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '核心动态演算',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('induction-accelerator requires a canvas');
    const scene = createInductionAcceleratorScene({
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
      schema: inductionAcceleratorControlsSchema,
      onChange: (key, value) => {
        if (booleanKeys.has(key))
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<InductionAcceleratorParams>);
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({
            [key]: number
          } as Partial<InductionAcceleratorParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'relaunch') scene.relaunch();
        if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          Object.entries(params).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<InductionAcceleratorParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<InductionAcceleratorParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
