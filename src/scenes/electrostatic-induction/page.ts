import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { electrostaticInductionControlsSchema } from './controls-schema';
import { createElectrostaticInductionScene } from './scene.entry';
import { electrostaticInductionMeta } from './scene.meta';
import type {
  ElectrostaticInductionParams,
  InductionAction
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const booleanKeys = new Set(['showCharges', 'autoRun']);
const enumKeys = new Set(['mode', 'rodPolarity']);
const modeValues = ['separate', 'grounding', 'equilibrium'] as const;
const rodValues = ['positive', 'negative'] as const;
function enumValue(key: string, value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isInteger(value))
    return key === 'mode' ? modeValues[value] : rodValues[value];
  if (typeof value === 'string') return value;
  return undefined;
}

bootScenePage({
  meta: electrostaticInductionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '电荷状态',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('electrostatic-induction requires a canvas');
    const scene = createElectrostaticInductionScene({
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
      schema: electrostaticInductionControlsSchema,
      onChange: (key, value) => {
        if (booleanKeys.has(key))
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<ElectrostaticInductionParams>);
        else if (enumKeys.has(key))
          scene.setParams({
            [key]: String(value)
          } as Partial<ElectrostaticInductionParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') scene.reset();
        else if (key === 'approach' || key === 'separate' || key === 'moveRod')
          scene.act(key as InductionAction);
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
        } as Partial<ElectrostaticInductionParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      if (enumKeys.has(key)) {
        const selected = enumValue(key, value);
        if (!selected) return false;
        ctx.scene.setParams({
          [key]: selected
        } as Partial<ElectrostaticInductionParams>);
        ctx.setControlActive(key, selected);
        return true;
      }
      return false;
    }
  }
});
