import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { connectedBodiesInclineControlsSchema } from './controls-schema';
import { createConnectedBodiesInclineScene } from './scene.entry';
import { connectedBodiesInclineMeta } from './scene.meta';
import type { ConnectedBodiesInclineParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const enumValues = ['freebody', 'animation'] as const;
function enumValue(
  value: unknown
): ConnectedBodiesInclineParams['mode'] | undefined {
  if (typeof value === 'number' && Number.isInteger(value))
    return enumValues[value];
  if (value === 'freebody' || value === 'animation') return value;
  return undefined;
}

bootScenePage({
  meta: connectedBodiesInclineMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('connected-bodies-incline requires a canvas');
    const scene = createConnectedBodiesInclineScene({
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
      schema: connectedBodiesInclineControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode')
          scene.setParams({
            mode: String(value) as ConnectedBodiesInclineParams['mode']
          });
        else if (key === 'showForces' || key === 'autoRun')
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<ConnectedBodiesInclineParams>);
        else
          scene.setParams({
            [key]: Number(value)
          } as Partial<ConnectedBodiesInclineParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('mode', 'freebody');
          renderer.setValue('massA', 5);
          renderer.setValue('massB', 4);
          renderer.setValue('angle', 37);
          renderer.setValue('mu', 0.2);
          renderer.setValue('showForces', true);
          renderer.setValue('autoRun', false);
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
      if (key === 'mode') {
        const mode = enumValue(value);
        if (!mode) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'showForces' || key === 'autoRun') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ConnectedBodiesInclineParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({
        [key]: n
      } as Partial<ConnectedBodiesInclineParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
