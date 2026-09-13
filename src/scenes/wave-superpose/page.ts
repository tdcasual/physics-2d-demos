import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { WaveSuperposeParams } from './scene.sim';
import { waveSuperposeControlsSchema } from './controls-schema';
import { createWaveSuperposeScene } from './scene.entry';
import { waveSuperposeMeta } from './scene.meta';

bootScenePage({
  meta: waveSuperposeMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '叠加数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('wave-superpose requires a canvas');
    const scene = createWaveSuperposeScene({ canvas, theme, mode, demoHints });
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
      schema: waveSuperposeControlsSchema,
      onChange: (key, value) => {
        if (key === 'direction1' || key === 'direction2') {
          scene.setParams({
            [key]: String(value)
          } as Partial<WaveSuperposeParams>);
          renderer.setActive(key, String(value));
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: Boolean(value) });
        else
          scene.setParams({
            [key]: Number(value)
          } as Partial<WaveSuperposeParams>);
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
      if (key === 'direction1' || key === 'direction2') {
        const direction = String(value) as WaveSuperposeParams['direction1'];
        if (!['up', 'down'].includes(direction)) return false;
        ctx.scene.setParams({
          [key]: direction
        } as Partial<WaveSuperposeParams>);
        ctx.setControlActive(key, direction);
        return true;
      }
      if (key === 'autoRun') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<WaveSuperposeParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
