import type { SceneLifecycle } from '../types';
import { projectileMeta } from './scene.meta';
import { createProjectileSim, type ProjectileParams } from './scene.sim';
import { createProjectileView } from './scene.view';

const defaultParams: ProjectileParams = {
  speed: projectileMeta.defaultParams.speed,
  angleDeg: projectileMeta.defaultParams.angleDeg,
  gravity: projectileMeta.defaultParams.gravity
};

const sim = createProjectileSim(defaultParams);
const view = createProjectileView();

export const projectileScene: SceneLifecycle = {
  init(): void {
    sim.reset();
  },
  reset(): void {
    sim.reset();
  },
  step(dt: number): void {
    sim.step(dt);
  },
  render(): void {
    view.render(sim.getState());
  },
  dispose(): void {
    view.dispose();
  }
};
