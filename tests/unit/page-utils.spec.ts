import { describe, expect, it, vi } from 'vitest';
import {
  createParamMapper,
  createPresetApplier,
  createSceneSelectorHandler
} from '../../src/scenes/page-utils';

describe('createParamMapper', () => {
  it('should map known keys and apply params', () => {
    const onApply = vi.fn();
    const mapper = createParamMapper<{ speed: number; angle: number }>(
      { v0: 'speed', theta: 'angle' },
      onApply
    );

    mapper('v0', 10);
    expect(onApply).toHaveBeenCalledWith({ speed: 10 });

    mapper('theta', 45);
    expect(onApply).toHaveBeenCalledWith({ angle: 45 });
  });

  it('should ignore unmapped keys', () => {
    const onApply = vi.fn();
    const mapper = createParamMapper<{ speed: number }>(
      { v0: 'speed' },
      onApply
    );

    mapper('unknown', 99);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('should pass through any value type', () => {
    const onApply = vi.fn();
    const mapper = createParamMapper<{ name: string; count: number }>(
      { n: 'name', c: 'count' },
      onApply
    );

    mapper('n', 'hello');
    expect(onApply).toHaveBeenCalledWith({ name: 'hello' });

    mapper('c', 42);
    expect(onApply).toHaveBeenCalledWith({ count: 42 });
  });
});

describe('createPresetApplier', () => {
  it('should apply known preset and call afterApply', () => {
    const onApply = vi.fn();
    const onAfter = vi.fn();
    const applier = createPresetApplier(
      { earth: { gravity: 9.8 }, moon: { gravity: 1.62 } },
      onApply,
      onAfter
    );

    const result = applier('earth');
    expect(result).toBe(true);
    expect(onApply).toHaveBeenCalledWith({ gravity: 9.8 });
    expect(onAfter).toHaveBeenCalled();
  });

  it('should return false for unknown preset', () => {
    const onApply = vi.fn();
    const applier = createPresetApplier({ earth: { gravity: 9.8 } }, onApply);

    const result = applier('mars');
    expect(result).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('should work without onAfterApply', () => {
    const onApply = vi.fn();
    const applier = createPresetApplier({ a: { x: 1 } }, onApply);

    applier('a');
    expect(onApply).toHaveBeenCalledWith({ x: 1 });
  });
});

describe('createSceneSelectorHandler', () => {
  it('should call setScene and after callback', () => {
    const setScene = vi.fn();
    const after = vi.fn();
    const handler = createSceneSelectorHandler(setScene, after);

    const result = handler('friction');
    expect(result).toBe(true);
    expect(setScene).toHaveBeenCalledWith('friction');
    expect(after).toHaveBeenCalled();
  });

  it('should work without after callback', () => {
    const setScene = vi.fn();
    const handler = createSceneSelectorHandler(setScene);

    handler('induction');
    expect(setScene).toHaveBeenCalledWith('induction');
  });
});
