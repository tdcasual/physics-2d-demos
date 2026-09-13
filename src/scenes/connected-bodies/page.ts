import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { connectedBodiesControlsSchema } from './controls-schema';
import { connectedBodiesMeta } from './scene.meta';
import { createConnectedBodiesScene } from './scene.entry';
import type { ConnectedBodiesParams } from './scene.sim';
bootScenePage({
  meta: connectedBodiesMeta,
  autoPlay: false,
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
    if (!canvas) throw new Error('connected-bodies requires a canvas');
    const scene = createConnectedBodiesScene({
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
      schema: connectedBodiesControlsSchema,
      onChange: (key, value) => {
        if (key === 'arrangement') {
          scene.setParams({
            arrangement: String(value) as ConnectedBodiesParams['arrangement']
          });
          renderer.setActive(key, String(value));
        } else
          scene.setParams({
            [key]: Number(value)
          } as Partial<ConnectedBodiesParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'cutUpper') scene.cut('upper');
        if (key === 'cutLower') scene.cut('lower');
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('arrangement', 'string-spring');
          renderer.setValue('massA', 2);
          renderer.setValue('massB', 1);
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
      if (key === 'arrangement') {
        const arrangement =
          String(value) === '1'
            ? 'spring-string'
            : (String(value) as ConnectedBodiesParams['arrangement']);
        ctx.scene.setParams({ arrangement });
        ctx.setControlActive(key, arrangement);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<ConnectedBodiesParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
