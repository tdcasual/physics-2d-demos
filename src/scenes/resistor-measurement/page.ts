import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { resistorControlsSchema } from './controls-schema';
import { asCircuitMode, asMeterMode, createResistorScene } from './scene.entry';
import { resistorMeta } from './scene.meta';
import { asBool, type ResistorParams } from './scene.sim';

const NUMBER_KEYS = [
  'targetResistance',
  'ammeterResistance',
  'voltmeterResistance',
  'supplyVoltage',
  'rheostatPosition'
] as const;

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<ResistorParams> {
  const next: Partial<ResistorParams> = {};
  const circuit = asCircuitMode(raw.circuitMode);
  if (circuit) next.circuitMode = circuit;
  const meter = asMeterMode(raw.meterMode);
  if (meter) next.meterMode = meter;
  for (const key of NUMBER_KEYS) {
    if (raw[key] === undefined) continue;
    const n = Number(raw[key]);
    if (Number.isFinite(n)) next[key] = n;
  }
  if (raw.autoRun !== undefined) next.autoRun = asBool(raw.autoRun, true);
  return next;
}

function syncControls(
  renderer: ReturnType<typeof renderSchema>,
  params: ResistorParams
): void {
  renderer.setActiveSilently('circuitMode', params.circuitMode);
  renderer.setActiveSilently('meterMode', params.meterMode);
  renderer.setValueSilently('targetResistance', params.targetResistance);
  renderer.setValueSilently('ammeterResistance', params.ammeterResistance);
  renderer.setValueSilently('voltmeterResistance', params.voltmeterResistance);
  renderer.setValueSilently('supplyVoltage', params.supplyVoltage);
  renderer.setValueSilently('rheostatPosition', params.rheostatPosition);
  renderer.setValueSilently('autoRun', params.autoRun);
}

bootScenePage({
  meta: resistorMeta,
  shouldAutoPlay: (_params, urlParams) =>
    paramsFromUrl(urlParams).autoRun !== false,
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
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('resistor-measurement requires a canvas');
    const scene = createResistorScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams: paramsFromUrl(urlParams ?? {})
    });
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
    const resistorScene = scene as ReturnType<typeof createResistorScene>;
    const render = scheduleRender ?? (() => resistorScene.render());
    const renderer = renderSchema({
      mount,
      schema: resistorControlsSchema,
      onChange: (key, value) => {
        if (key === 'circuitMode') {
          const mode = asCircuitMode(value) ?? 'divider';
          resistorScene.setParams({ circuitMode: mode });
          renderer.setActive(key, mode);
        } else if (key === 'meterMode') {
          const mode = asMeterMode(value) ?? 'external';
          resistorScene.setParams({ meterMode: mode });
          renderer.setActive(key, mode);
        } else if (key === 'autoRun') {
          resistorScene.setParams({ autoRun: asBool(value, true) });
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          resistorScene.setParams({
            [key]: Number(value)
          } as Partial<ResistorParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene: () => syncControls(renderer, resistorScene.getParams())
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'circuitMode') {
        const mode = asCircuitMode(value) ?? 'divider';
        ctx.scene.setParams({ circuitMode: mode });
        ctx.setControlActive('circuitMode', mode);
        return true;
      }
      if (key === 'meterMode') {
        const mode = asMeterMode(value) ?? 'external';
        ctx.scene.setParams({ meterMode: mode });
        ctx.setControlActive('meterMode', mode);
        return true;
      }
      if (key === 'autoRun') {
        const on = asBool(value, true);
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ [key]: n } as Partial<ResistorParams>);
          ctx.setControlValue(key, n);
        }
        return true;
      }
      return false;
    }
  }
});
