import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDefaultStrategies } from '../../src/app/layouts/default-strategies';
import { layoutSelector } from '../../src/app/layouts/selector';
import { layoutRegistry } from '../../src/app/layouts/registry';

vi.mock('../../src/app/layouts/selector', () => ({
  layoutSelector: {
    clear: vi.fn(),
    register: vi.fn()
  }
}));

vi.mock('../../src/app/layouts/registry', () => ({
  layoutRegistry: {
    getMetadata: vi.fn(),
    getAllMetadata: vi.fn(() => [
      { id: 'split-right', priority: 10, autoSelectable: true },
      { id: 'mobile-stack', priority: 5, autoSelectable: true },
      { id: 'legacy', priority: 1, autoSelectable: false }
    ])
  }
}));

describe('registerDefaultStrategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear existing strategies', () => {
    registerDefaultStrategies();
    expect(layoutSelector.clear).toHaveBeenCalledTimes(1);
  });

  it('should register 3 strategies', () => {
    registerDefaultStrategies();
    expect(layoutSelector.register).toHaveBeenCalledTimes(3);
  });

  it('strategy 1: should return user preference if set', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy1 = strategies[0][0];
    const result = strategy1({ userPreference: 'mobile-stack' } as Parameters<
      typeof strategy1
    >[0]);
    expect(result).toBe('mobile-stack');
  });

  it('strategy 1: should return null if no user preference', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy1 = strategies[0][0];
    const result = strategy1({ userPreference: null } as Parameters<
      typeof strategy1
    >[0]);
    expect(result).toBeNull();
  });

  it('strategy 2: should return scene preference if valid', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'split-right',
      autoSelectable: true,
      constraints: {}
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy2 = strategies[1][0];
    const result = strategy2({
      scenePreference: 'split-right',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<typeof strategy2>[0]);
    expect(result).toBe('split-right');
  });

  it('strategy 2: should honor scene preference even if not autoSelectable', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'legacy',
      autoSelectable: false,
      constraints: {}
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy2 = strategies[1][0];
    const result = strategy2({
      scenePreference: 'legacy',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<typeof strategy2>[0]);
    expect(result).toBe('legacy');
  });

  it('strategy 2: should return null if scene preference not in registry', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue(undefined);

    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy2 = strategies[1][0];
    const result = strategy2({
      scenePreference: 'unknown',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<typeof strategy2>[0]);
    expect(result).toBeNull();
  });

  it('strategy 2: should return null if no scene preference', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy2 = strategies[1][0];
    const result = strategy2({
      scenePreference: null,
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<typeof strategy2>[0]);
    expect(result).toBeNull();
  });

  it('strategy 3: should return highest priority candidate', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy3 = strategies[2][0];
    const result = strategy3({
      availableLayouts: [
        { id: 'mobile-stack', priority: 5, autoSelectable: true },
        { id: 'split-right', priority: 10, autoSelectable: true }
      ],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<typeof strategy3>[0]);
    expect(result).toBe('split-right');
  });

  it('strategy 3: should filter out non-autoSelectable', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy3 = strategies[2][0];
    const result = strategy3({
      availableLayouts: [
        { id: 'legacy', priority: 1, autoSelectable: false },
        { id: 'mobile-stack', priority: 5, autoSelectable: true }
      ],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<typeof strategy3>[0]);
    expect(result).toBe('mobile-stack');
  });

  it('strategy 3: should return null if no candidates', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy3 = strategies[2][0];
    const result = strategy3({
      availableLayouts: [],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<typeof strategy3>[0]);
    expect(result).toBeNull();
  });

  it('strategy 3: should respect viewport constraints', () => {
    registerDefaultStrategies();
    const strategies = vi.mocked(layoutSelector.register).mock.calls;
    const strategy3 = strategies[2][0];
    const result = strategy3({
      availableLayouts: [
        {
          id: 'split-right',
          priority: 10,
          autoSelectable: true,
          constraints: { minWidth: 1000 }
        },
        {
          id: 'mobile-stack',
          priority: 5,
          autoSelectable: true,
          constraints: { maxWidth: 500 }
        }
      ],
      viewport: { width: 800, height: 600 },
      orientation: 'landscape'
    } as unknown as Parameters<typeof strategy3>[0]);
    // 800px does not satisfy split-right (minWidth 1000) or mobile-stack (maxWidth 500)
    expect(result).toBeNull();
  });

  it('should be idempotent', () => {
    registerDefaultStrategies();
    registerDefaultStrategies();
    expect(layoutSelector.clear).toHaveBeenCalledTimes(2);
    expect(layoutSelector.register).toHaveBeenCalledTimes(6);
  });
});
