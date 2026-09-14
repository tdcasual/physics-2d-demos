import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { chargedSuperpositionControlsSchema } from './controls-schema';
import { createChargedSuperpositionScene } from './scene.entry';
import { chargedSuperpositionMeta } from './scene.meta';
import {
  asChargedParticleKind,
  chargedParticleIndex,
  type ChargedSuperpositionParams
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const booleanKeys = new Set(['autoRun', 'slowMode', 'showVectors']);
bootScenePage({
  meta: chargedSuperpositionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '传感器数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('charged-superposition requires a canvas');
    const scene = createChargedSuperpositionScene({
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
      schema: chargedSuperpositionControlsSchema,
      onChange: (key, value) => {
        if (key === 'particle') {
          const particle = asChargedParticleKind(value);
          if (!particle) return;
          scene.setParams({ particle });
          renderer.setActive(key, particle);
          writeParam?.(key, chargedParticleIndex(particle));
        } else if (booleanKeys.has(key)) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<ChargedSuperpositionParams>);
          writeParam?.(key, value);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({
            [key]: number
          } as Partial<ChargedSuperpositionParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'relaunch') scene.relaunch();
        if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          Object.entries(params).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
          renderer.setActive('particle', params.particle);
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
      if (key === 'particle') {
        const particle = asChargedParticleKind(value);
        if (!particle) return false;
        ctx.scene.setParams({ particle });
        ctx.setControlActive(key, particle);
        return true;
      }
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ChargedSuperpositionParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<ChargedSuperpositionParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
