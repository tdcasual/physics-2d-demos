import type { ResolvedDemoProfile } from '../../../../platform/demo-profile';
import { STAGE_CHROME_ATTR } from '../../../../platform/stage-chrome';
import { moveNode, type MovedNode } from '../../../../ui/utils/node-mover';

export interface GraphAdoptionState {
  node: HTMLElement;
  mover: MovedNode;
  height: string;
}

export function adoptDemoGraph(options: {
  profile: ResolvedDemoProfile;
  geometryEnabled: boolean;
  container: HTMLElement;
  graphSelector: string;
  animationSlot: HTMLElement | null;
  hasGraph: boolean;
  notifyResize(): void;
}): GraphAdoptionState | null {
  const {
    profile,
    geometryEnabled,
    container,
    graphSelector,
    animationSlot,
    hasGraph,
    notifyResize
  } = options;
  if (!geometryEnabled || profile.graphPanel !== 'visible') return null;
  if (
    profile.controlPanel !== 'hidden' &&
    profile.controlPanel !== 'collapsed'
  ) {
    return null;
  }
  if (!hasGraph || !animationSlot) return null;
  const graph = container.querySelector<HTMLElement>(graphSelector);
  if (!graph || !graph.closest('.layout-left-panel')) return null;

  const state: GraphAdoptionState = {
    node: graph,
    mover: moveNode(graph, animationSlot),
    height: graph.style.height
  };
  graph.classList.add('is-demo-stage-graph');
  graph.setAttribute(STAGE_CHROME_ATTR, '');
  animationSlot.classList.add('is-demo-stage-with-graph');
  notifyResize();
  return state;
}

export function restoreDemoGraph(
  state: GraphAdoptionState | null,
  animationSlot: HTMLElement | null
): void {
  if (!state) return;
  state.node.classList.remove('is-demo-stage-graph');
  state.node.removeAttribute(STAGE_CHROME_ATTR);
  animationSlot?.classList.remove('is-demo-stage-with-graph');
  state.node.style.height = state.height;
  state.mover.restore();
}
