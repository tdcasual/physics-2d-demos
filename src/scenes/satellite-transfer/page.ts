import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { SatelliteParams } from './scene.sim';
import { satelliteControlsSchema } from './controls-schema';
import { createSatelliteScene } from './scene.entry';
import { satelliteMeta } from './scene.meta';

bootScenePage({
  meta: satelliteMeta,
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
    if (!canvas) throw new Error('satellite-transfer requires a canvas');
    const scene = createSatelliteScene({ canvas, theme, mode, demoHints });
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
      schema: satelliteControlsSchema,
      onChange: (key, value) => {
        if (key === 'orbit') {
          const orbit = String(value) as SatelliteParams['orbit'];
          scene.setParams({ orbit });
          renderer.setActive(key, orbit);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          writeParam?.(key, value);
        } else {
          scene.setParams({ [key]: Number(value) } as Partial<SatelliteParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'raise') {
          scene.setParams({ orbit: 'high' });
          renderer.setActive('orbit', 'high');
        } else if (key === 'lower') {
          scene.setParams({ orbit: 'low' });
          renderer.setActive('orbit', 'low');
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'orbit') {
        const orbit = String(value) as SatelliteParams['orbit'];
        if (!['low', 'transfer', 'high'].includes(orbit)) return false;
        ctx.scene.setParams({ orbit });
        ctx.setControlActive(key, orbit);
        return true;
      }
      if (key === 'autoRun') {
        const enabled = value === '1' || String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<SatelliteParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
