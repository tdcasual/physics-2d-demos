import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { electrostaticShieldingControlsSchema } from './controls-schema';
import { createElectrostaticShieldingScene } from './scene.entry';
import { electrostaticShieldingMeta } from './scene.meta';
import type { ElectrostaticShieldingParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const booleanKeys = new Set([
  'externalField',
  'cavityCharge',
  'grounded',
  'showGaussian',
  'showProbe',
  'autoRun',
  'slowMode'
]);

bootScenePage({
  meta: electrostaticShieldingMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '探针数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('electrostatic-shielding requires a canvas');
    const scene = createElectrostaticShieldingScene({
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
      schema: electrostaticShieldingControlsSchema,
      onChange: (key, value) => {
        if (booleanKeys.has(key))
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<ElectrostaticShieldingParams>);
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({
            [key]: number
          } as Partial<ElectrostaticShieldingParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
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
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ElectrostaticShieldingParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<ElectrostaticShieldingParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
