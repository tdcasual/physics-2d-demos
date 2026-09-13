import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createFaradayScene } from './scene.entry';
import { faradayMeta } from './scene.meta';
import { faradayControlsSchema } from './controls-schema';
import type { FaradayField, FaradayParams, FaradayRotation } from './scene.sim';

bootScenePage({
  meta: faradayMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('faraday-disc requires a canvas');
    const scene = createFaradayScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const faradayScene = scene as ReturnType<typeof createFaradayScene>;
    const renderer = renderSchema({
      mount,
      schema: faradayControlsSchema,
      onChange: (key, value) => {
        if (key === 'rotation') {
          faradayScene.setRotation(String(value) as FaradayRotation);
          renderer.setActive(key, String(value));
        } else if (key === 'field') {
          faradayScene.setField(String(value) as FaradayField);
          renderer.setActive(key, String(value));
        } else if (key === 'closed')
          faradayScene.setParams({ closed: Boolean(value) });
        else
          faradayScene.setParams({
            [key]: Number(value)
          } as Partial<FaradayParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string): void {
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
