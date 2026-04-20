import { describe, expect, it, vi } from 'vitest';
import { createSceneListener } from '../../src/app/scene-listener';

describe('createSceneListener', () => {
  it('should notify subscribed listener', () => {
    const { subscribe, notify } = createSceneListener();
    const listener = vi.fn();
    subscribe(listener);
    notify();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe', () => {
    const { subscribe, notify } = createSceneListener();
    const listener = vi.fn();
    const dispose = subscribe(listener);
    dispose();
    notify();
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple subscribers (last wins)', () => {
    const { subscribe, notify } = createSceneListener();
    const first = vi.fn();
    const second = vi.fn();
    subscribe(first);
    subscribe(second);
    notify();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('should not throw when notify without listener', () => {
    const { notify } = createSceneListener();
    expect(() => notify()).not.toThrow();
  });
});
