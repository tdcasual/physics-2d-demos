import type { ResolvedDemoProfile } from '../../../../platform/demo-profile';
import { moveNode, type MovedNode } from '../../../../ui/utils/node-mover';

export interface DemoChipsState {
  slot: HTMLElement | null;
  movers: Map<HTMLElement, MovedNode>;
}

export function mountDemoChips(
  state: DemoChipsState,
  options: {
    profile: ResolvedDemoProfile;
    geometryEnabled: boolean;
    container: HTMLElement;
    controlRoot: HTMLElement | null;
  }
): void {
  const { profile, geometryEnabled, container, controlRoot } = options;
  if (
    !geometryEnabled ||
    profile.controlPanel !== 'hidden' ||
    !profile.visibleControlKeys.length
  ) {
    return;
  }
  const readoutPanel = container.querySelector<HTMLElement>('.readout-panel');
  if (!readoutPanel || !controlRoot) return;

  state.slot = document.createElement('div');
  state.slot.className = 'demo-chip-slot';
  readoutPanel.appendChild(state.slot);
  profile.visibleControlKeys.forEach((key) => {
    const node = controlRoot.querySelector<HTMLElement>(
      `[data-control-key="${key}"]`
    );
    if (!node || !node.parentElement || !state.slot) return;
    state.movers.set(node, moveNode(node, state.slot));
    node.style.display = '';
  });
}

export function restoreDemoChips(state: DemoChipsState): void {
  state.movers.forEach((mover) => mover.restore());
  state.movers.clear();
  state.slot?.remove();
  state.slot = null;
}
