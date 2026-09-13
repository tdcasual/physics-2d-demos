import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { projectileComponentsControlsSchema } from './controls-schema';
import { projectileComponentsMeta } from './scene.meta';
import { createProjectileComponentsScene } from './scene.entry';
import type { ProjectileComponentsParams } from './scene.sim';

bootScenePage({
  meta: projectileComponentsMeta,
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
    if (!canvas) throw new Error('projectile-components requires a canvas');
    const scene = createProjectileComponentsScene({
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
      schema: projectileComponentsControlsSchema,
      onChange: (key, value) => {
        if (
          key === 'speed' ||
          key === 'initialHeight' ||
          key === 'gravity' ||
          key === 'samplePeriod'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ProjectileComponentsParams>);
        } else if (
          key === 'autoRun' ||
          key === 'showTrajectory' ||
          key === 'showVectors' ||
          key === 'showShadows' ||
          key === 'showStrobe'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ProjectileComponentsParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          renderer.setValue('speed', 15);
          renderer.setValue('initialHeight', 45);
          renderer.setValue('gravity', 10);
          renderer.setValue('samplePeriod', 0.5);
          renderer.setValue('autoRun', true);
          renderer.setValue('showTrajectory', true);
          renderer.setValue('showVectors', true);
          renderer.setValue('showShadows', true);
          renderer.setValue('showStrobe', true);
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
      const numericKeys = ['speed', 'initialHeight', 'gravity', 'samplePeriod'];
      const booleanKeys = [
        'autoRun',
        'showTrajectory',
        'showVectors',
        'showShadows',
        'showStrobe'
      ];
      if (numericKeys.includes(key)) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ProjectileComponentsParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (booleanKeys.includes(key)) {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ProjectileComponentsParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
