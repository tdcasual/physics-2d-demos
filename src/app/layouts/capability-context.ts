import type {
  CapabilityContext,
  CapabilityEvents,
  CapabilityInstance,
  Scene,
  Theme,
  SceneContainerEvents
} from './types';
import {
  resolveDemoProfile,
  type DemoRenderHints
} from '../../platform/demo-profile';

type Mode = 'normal' | 'presentation';
type DemoProfileUpdate = CapabilityEvents['modechange'];

export interface BuildCapabilityContextOptions {
  container: HTMLElement;
  scene: Scene | null;
  getTheme(): Theme;
  setTheme(theme: Theme): void;
  getCurrentLayoutId(): string;
  switchLayout(layoutId: string, savePreference?: boolean): void;
  getAvailableLayouts(): { id: string; name: string }[];
  emit<K extends keyof SceneContainerEvents>(
    event: K,
    payload: SceneContainerEvents[K]
  ): void;
  on?<K extends keyof SceneContainerEvents>(
    event: K,
    handler: (payload: SceneContainerEvents[K]) => void
  ): () => void;
  updateDemoProfileInstances(payload: DemoProfileUpdate): void;
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
    emit,
    on,
    updateDemoProfileInstances
  } = options;

  return {
    container,
    getTheme,
    setTheme,
    getMode: () =>
      container.getAttribute('data-mode') === 'presentation'
        ? 'presentation'
        : 'normal',
    setMode: (mode: Mode) => {
      container.setAttribute('data-mode', mode);
      const raw =
        mode === 'presentation' ? scene?.getDemoProfile?.() || null : null;
      const profile =
        mode === 'presentation' && raw && scene?.id
          ? resolveDemoProfile(raw, { sceneId: scene.id })
          : null;
      const payload = { mode, profile };
      emit('layout:mode', payload);
      container.dispatchEvent(
        new CustomEvent('layout:modechange', {
          detail: payload,
          bubbles: true
        })
      );
      updateDemoProfileInstances(payload);
      if (mode === 'presentation' && profile) {
        const withHints = scene as unknown as {
          setMode?(m: Mode, hints?: DemoRenderHints): void;
        };
        withHints?.setMode?.(mode, profile.renderHints);
      } else {
        scene?.setMode?.(mode);
      }
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
    }
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
