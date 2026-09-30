import type {
  CapabilityContext,
  CapabilityEvents,
  CapabilityInstance,
  Scene,
  Theme,
  SceneContainerEvents
} from './types';
import type { ModeOwner } from './mode-owner';
import type { SidebarStateOwner } from './sidebar-state';
import type { WorkspaceUiState } from './workspace-ui-state';

type Mode = 'normal' | 'presentation';
type DemoProfileUpdate = CapabilityEvents['modechange'];

export interface BuildCapabilityContextOptions {
  container: HTMLElement;
  scene: Scene | null;
  getTheme(): Theme;
  setTheme(theme: Theme): void;
  getCurrentLayoutId(): string;
  switchLayout(
    layoutId: string,
    savePreference?: boolean
  ): Promise<void> | void;
  getAvailableLayouts(): { id: string; name: string }[];
  on?<K extends keyof SceneContainerEvents>(
    event: K,
    handler: (payload: SceneContainerEvents[K]) => void
  ): () => void;
  modeOwner: ModeOwner;
  sidebar: SidebarStateOwner;
  workspaceUi: WorkspaceUiState;
}

export function buildCapabilityContext(
  options: BuildCapabilityContextOptions
): CapabilityContext {
  const {
    container,
    scene,
    getTheme,
    setTheme,
    getCurrentLayoutId,
    switchLayout,
    getAvailableLayouts,
    on,
    modeOwner,
    sidebar,
    workspaceUi
  } = options;

  return {
    container,
    getTheme,
    setTheme,
    getMode: () => modeOwner.getMode(),
    setMode: (mode: Mode) => {
      modeOwner.setMode(mode, 'toggle');
    },
    switchLayout,
    getCurrentLayoutId,
    getAvailableLayouts,
    on: <K extends keyof CapabilityEvents>(
      event: K,
      handler: (payload: CapabilityEvents[K]) => void
    ) => {
      if (event === 'modechange' && on) {
        return on('layout:mode', (payload) =>
          handler(payload as CapabilityEvents[K])
        );
      }
      return () => {};
    },
    requestStageRepaint: () => scene?.requestStageRepaint(),
    sidebar,
    workspaceUi
  };
}

export function updateCapabilityInstances(
  instances: CapabilityInstance[],
  payload: DemoProfileUpdate
): void {
  instances.forEach((instance) => {
    instance.update?.(payload);
  });
}
