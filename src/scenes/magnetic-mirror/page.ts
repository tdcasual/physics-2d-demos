import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createMagneticMirrorScene } from './scene.entry';
import { magneticMirrorMeta } from './scene.meta';
import { magneticMirrorControlsSchema } from './controls-schema';
import type { MagneticMirrorParams, MirrorMode } from './scene.sim';

bootScenePage({
  meta: magneticMirrorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 290,
    leftMaxWidth: 440,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('magnetic-mirror requires a canvas');
    const scene = createMagneticMirrorScene({ canvas, theme, mode, demoHints });
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
      schema: magneticMirrorControlsSchema,
      onChange: (key, value) => {
        const next = {
          [key]:
            key === 'mode'
              ? (String(value) as MirrorMode)
              : ['autoRun', 'showVelocity', 'showField', 'showForce'].includes(
                    key
                  )
                ? Boolean(value)
                : Number(value)
        } as Partial<MagneticMirrorParams>;
        scene.setParams(next);
        if (key === 'mode') renderer.setActive(key, String(value));
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        renderer.dispose();
      }
    };
  }
});
