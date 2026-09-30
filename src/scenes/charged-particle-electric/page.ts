import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { chargedParticleElectricControlsSchema } from './controls-schema';
import { chargedParticleElectricMeta } from './scene.meta';
import {
  asElectricParticle,
  createChargedParticleElectricScene
} from './scene.entry';
import type { ChargedParticleElectricParams } from './scene.sim';

bootScenePage({
  meta: chargedParticleElectricMeta,
  autoPlay: true,
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
    if (!canvas) throw new Error('charged-particle-electric requires a canvas');
    const scene = createChargedParticleElectricScene({
      canvas,
      theme,
      mode,
      demoHints
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
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: chargedParticleElectricControlsSchema,
      onAction: () => {},
      onChange: (key, value) => {
        if (key === 'particle') {
          const particle = asElectricParticle(value);
          if (particle) scene.setParams({ particle });
        } else if (
          key === 'accelVoltage' ||
          key === 'deflectVoltage' ||
          key === 'plateGap'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ChargedParticleElectricParams>);
        } else if (
          key === 'autoRun' ||
          key === 'showComponents' ||
          key === 'showReverse'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ChargedParticleElectricParams>);
        }
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'particle') {
        const particle = asElectricParticle(value);
        if (!particle) return false;
        ctx.scene.setParams({ particle });
        ctx.setControlValue(key, particle);
        return true;
      }
      if (
        key === 'accelVoltage' ||
        key === 'deflectVoltage' ||
        key === 'plateGap'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ChargedParticleElectricParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (
        key === 'autoRun' ||
        key === 'showComponents' ||
        key === 'showReverse'
      ) {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ChargedParticleElectricParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
