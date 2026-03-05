export type TouchInteractionMode = 'default' | 'drag';

export function applyTouchInteractionMode(target: HTMLElement, mode: TouchInteractionMode): void {
  target.classList.add('touch-interaction-surface');
  target.classList.toggle('is-touch-drag', mode === 'drag');
  target.style.touchAction = mode === 'drag' ? 'none' : 'manipulation';
}
