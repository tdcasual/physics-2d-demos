import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { JouleParams } from './scene.sim';
import { jouleControlsSchema } from './controls-schema';
import { createJouleScene } from './scene.entry';
import { jouleMeta } from './scene.meta';

const MODE_IDS: Record<string, 0 | 1> = { mechanical: 0, electric: 1 };
function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
function modeValue(value: unknown): 0 | 1 | null {
  if (value === 0 || value === '0' || value === 'mechanical') return 0;
  if (value === 1 || value === '1' || value === 'electric') return 1;
  return null;
}

bootScenePage({
  meta: jouleMeta,
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
    if (!canvas) throw new Error('joule-work-heat requires a canvas');
    const scene = createJouleScene({ canvas, theme, mode, demoHints });
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
      schema: jouleControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const next = MODE_IDS[String(value)];
          if (next === undefined) return;
          scene.setParams({ mode: next });
          renderer.setActive('mode', String(value));
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: asBoolean(value) });
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<JouleParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'matchWork') scene.matchWork();
        else if (key === 'reset') scene.reset();
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
        const mode = modeValue(value);
        if (mode === null) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode === 0 ? 'mechanical' : 'electric');
        return true;
      }
      if (key === 'autoRun') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<JouleParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
