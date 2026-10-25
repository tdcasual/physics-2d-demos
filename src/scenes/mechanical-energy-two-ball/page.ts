import { bootScenePage } from '../../app/scene-bootstrapper';
import { mechanicalEnergyTwoBallControlsSchema } from './controls-schema';
import { createMechanicalEnergyTwoBallScene } from './scene.entry';
import { mechanicalEnergyTwoBallMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
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
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: mechanicalEnergyTwoBallControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
