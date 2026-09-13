import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createBindingEnergyScene } from './scene.entry';
import { bindingEnergyMeta } from './scene.meta';
import { bindingEnergyControlsSchema } from './controls-schema';
import type { BindingEnergyParams } from './scene.sim';
bootScenePage({
  meta: bindingEnergyMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('binding-energy requires a canvas');
    const scene = createBindingEnergyScene({ canvas, theme, mode, demoHints });
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
      schema: bindingEnergyControlsSchema,
      onChange: (key, value) => {
        scene.setParams({
          [key]:
            key === 'autoRun' || key === 'showRegions'
              ? Boolean(value)
              : Number(value)
        } as Partial<BindingEnergyParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive: () => {},
      dispose(): void {
        renderer.dispose();
      }
    };
  }
});
