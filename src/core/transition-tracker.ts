/**
 * Tracks discrete value changes and provides a smooth alpha transition.
 * Use for step/mode switches in canvas-based scenes.
 */
export function createTransitionTracker(durationMs = 250) {
  let prevValue: string | number | undefined;
  let transitionStart = 0;
  let isTransitioning = false;

  return {
    /**
     * Call each frame with the current value.
     * Returns alpha 0→1 during transition, 1 when settled.
     */
    update(value: string | number, now = performance.now()): number {
      if (value !== prevValue) {
        prevValue = value;
        transitionStart = now;
        isTransitioning = true;
      }
      if (!isTransitioning) return 1;

      const elapsed = now - transitionStart;
      if (elapsed >= durationMs) {
        isTransitioning = false;
        return 1;
      }
      // Ease-out cubic
      const t = elapsed / durationMs;
      return 1 - Math.pow(1 - t, 3);
    },

    get isTransitioning(): boolean {
      return isTransitioning;
    }
  };
}
