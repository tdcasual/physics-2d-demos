import { testSceneEntry } from './scene-entry-factory';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';
import { createChaseMeetScene } from '../../src/scenes/chase-meet/scene.entry';
import { createElectrificationScene } from '../../src/scenes/electrification/scene.entry';
import { createFieldLinesScene } from '../../src/scenes/field-lines/scene.entry';

testSceneEntry(
  'projectile',
  (opts) => createProjectileScene(opts as { canvas: HTMLCanvasElement }),
  {
    needsCanvas: true,
    supportsSetParams: true,
    supportsGetState: true,
    supportsGetReadoutItems: true,
    supportsSubscribe: true
  }
);

testSceneEntry('chase-meet', (opts) => createChaseMeetScene(opts), {
  needsCanvas: true,
  needsStageSlot: true,
  supportsSetParams: true,
  supportsGetState: true,
  supportsGetSnapshot: true
});

testSceneEntry('electrification', (opts) => createElectrificationScene(opts), {
  needsCanvas: true,
  supportsGetSnapshot: true
});

testSceneEntry('field-lines', (opts) => createFieldLinesScene(opts), {
  needsCanvas: true,
  supportsGetSnapshot: true
});
