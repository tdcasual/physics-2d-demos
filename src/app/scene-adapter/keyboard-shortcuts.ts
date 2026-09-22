import type { Theme } from '../layouts/types';
import type { KeyboardShortcutManager } from '../../platform/input/keyboard-shortcuts';
import type { KeyboardHelpOverlay } from '../../ui/components/KeyboardHelp';

export interface SceneKeyboardShortcutHandlers {
  isPlaying(): boolean;
  start(): void;
  pause(): void;
  reset(): void;
  toggleTheme(next: Theme): void;
  step(deltaSeconds: number): void;
  adjustTimeScale(delta: number): void;
  toggleFullscreen(): void;
  switchLayout(): void;
  exitPresentation(): void;
}

/** Register the scene-wide keyboard contract without coupling it to SceneAdapter. */
export function registerSceneKeyboardShortcuts(
  keyboard: KeyboardShortcutManager,
  keyboardHelp: KeyboardHelpOverlay,
  handlers: SceneKeyboardShortcutHandlers
): void {
  keyboard.registerMultiple({
    ' ': () => {
      if (handlers.isPlaying()) handlers.pause();
      else handlers.start();
    },
    r: () => handlers.reset(),
    t: () => {
      const current = document.documentElement.getAttribute('data-theme');
      handlers.toggleTheme((current === 'dark' ? 'light' : 'dark') as Theme);
    },
    arrowleft: () => handlers.step(-0.016),
    arrowright: () => handlers.step(0.016),
    a: () => handlers.adjustTimeScale(0.25),
    d: () => handlers.adjustTimeScale(-0.25),
    f: () => handlers.toggleFullscreen(),
    l: () => handlers.switchLayout(),
    '?': () => keyboardHelp.toggle(),
    escape: () => {
      keyboardHelp.hide();
      handlers.exitPresentation();
    }
  });
}
