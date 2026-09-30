import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { TwoBallParams } from './scene.sim';
import { mechanicalEnergyTwoBallControlsSchema } from './controls-schema';
import { createMechanicalEnergyTwoBallScene } from './scene.entry';
import { mechanicalEnergyTwoBallMeta } from './scene.meta';
const bool = (v: unknown) =>
  v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
bootScenePage({
  meta: mechanicalEnergyTwoBallMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '能量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createMechanicalEnergyTwoBallScene({ canvas, theme, mode, demoHints }),
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: mechanicalEnergyTwoBallControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'autoRun') scene.setParams({ autoRun: bool(value) });
        else
          scene.setParams({ [key]: Number(value) } as Partial<TwoBallParams>);
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  }
});
