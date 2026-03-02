import type { ProjectileState } from './scene.sim';

export function createProjectileView() {
  let lastState: ProjectileState | null = null;

  return {
    render(state: ProjectileState): void {
      lastState = state;
    },
    getLastState(): ProjectileState | null {
      return lastState;
    },
    dispose(): void {
      lastState = null;
    }
  };
}
