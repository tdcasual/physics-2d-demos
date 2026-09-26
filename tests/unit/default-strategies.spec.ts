import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDefaultStrategies } from '../../src/app/layouts/default-strategies';
import { layoutSelector } from '../../src/app/layouts/selector';
import { layoutRegistry } from '../../src/app/layouts/registry';
import type { LayoutSelectionStrategy } from '../../src/app/layouts/selector';

vi.mock('../../src/app/layouts/selector', () => ({
  layoutSelector: {
    clear: vi.fn(),
    register: vi.fn()
  }
}));

vi.mock('../../src/app/layouts/registry', () => ({
  layoutRegistry: {
    has: vi.fn(),
    getMetadata: vi.fn(),
    getAllMetadata: vi.fn(() => [
      { id: 'split-right', priority: 10, autoSelectable: true },
      { id: 'mobile-stack', priority: 5, autoSelectable: true },
      { id: 'legacy', priority: 1, autoSelectable: false }
    ])
  }
}));

// 策略按注册顺序索引：0=forced（URL 强制）、1=偏好（约束内）、
// 2=场景偏好、3=自动匹配。
function strategyAt(index: number) {
  return vi.mocked(layoutSelector.register).mock.calls[index][0];
}

describe('registerDefaultStrategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear existing strategies', () => {
    registerDefaultStrategies();
    expect(layoutSelector.clear).toHaveBeenCalledTimes(1);
  });

  it('should register 4 strategies (forced / preference / scene / auto)', () => {
    registerDefaultStrategies();
    expect(layoutSelector.register).toHaveBeenCalledTimes(4);
  });

  // ---- 策略 0：URL 强制布局 ----

  it('strategy 0: should return a registered forcedLayout over everything', () => {
    vi.mocked(layoutRegistry.has).mockReturnValue(true);
    registerDefaultStrategies();
    const result = strategyAt(0)({
      forcedLayout: 'lab-stage',
      userPreference: 'split-right',
      scenePreference: 'split-right'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('lab-stage');
  });

  it('strategy 0: should ignore an unregistered forcedLayout', () => {
    vi.mocked(layoutRegistry.has).mockReturnValue(false);
    registerDefaultStrategies();
    const result = strategyAt(0)({
      forcedLayout: 'nonexistent'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  it('strategy 0: should return null without forcedLayout', () => {
    registerDefaultStrategies();
    const result = strategyAt(0)({
      userPreference: 'split-right'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  // ---- 策略 1：用户偏好（约束内的粘滞）----

  it('strategy 1: should return a satisfied user preference', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'mobile-stack',
      autoSelectable: true,
      constraints: {}
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const result = strategyAt(1)({
      userPreference: 'mobile-stack',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('mobile-stack');
  });

  it('strategy 1: should return null when the preference violates viewport constraints', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'split-right',
      autoSelectable: true,
      constraints: { minWidth: 900 }
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const result = strategyAt(1)({
      userPreference: 'split-right',
      viewport: { width: 375, height: 812 },
      orientation: 'portrait'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  it('strategy 1: should return null if no user preference', () => {
    registerDefaultStrategies();
    const result = strategyAt(1)({
      userPreference: null
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  it('strategy 1: should return null if the preference is not registered', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue(undefined);

    registerDefaultStrategies();
    const result = strategyAt(1)({
      userPreference: 'unknown',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  // ---- 策略 2：场景偏好 ----

  it('strategy 2: should return scene preference if valid', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'split-right',
      autoSelectable: true,
      constraints: {}
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const result = strategyAt(2)({
      scenePreference: 'split-right',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('split-right');
  });

  it('strategy 2: should honor scene preference even if not autoSelectable', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'legacy',
      autoSelectable: false,
      constraints: {}
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const result = strategyAt(2)({
      scenePreference: 'legacy',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('legacy');
  });

  it('strategy 2: should return null if scene preference not in registry', () => {
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue(undefined);

    registerDefaultStrategies();
    const result = strategyAt(2)({
      scenePreference: 'unknown',
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  it('strategy 2: should return null if no scene preference', () => {
    registerDefaultStrategies();
    const result = strategyAt(2)({
      scenePreference: null,
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  // ---- 策略 3：自动匹配 ----

  it('strategy 3: should return highest priority candidate', () => {
    registerDefaultStrategies();
    const result = strategyAt(3)({
      availableLayouts: [
        { id: 'mobile-stack', priority: 5, autoSelectable: true },
        { id: 'split-right', priority: 10, autoSelectable: true }
      ],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('split-right');
  });

  it('strategy 3: should filter out non-autoSelectable', () => {
    registerDefaultStrategies();
    const result = strategyAt(3)({
      availableLayouts: [
        { id: 'legacy', priority: 1, autoSelectable: false },
        { id: 'mobile-stack', priority: 5, autoSelectable: true }
      ],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('mobile-stack');
  });

  it('strategy 3: should return null if no candidates', () => {
    registerDefaultStrategies();
    const result = strategyAt(3)({
      availableLayouts: [],
      viewport: { width: 1200, height: 800 },
      orientation: 'landscape'
    } as unknown as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBeNull();
  });

  it('strategy 3: should respect viewport constraints', () => {
    registerDefaultStrategies();
    const result = strategyAt(3)({
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
    } as unknown as Parameters<LayoutSelectionStrategy>[0]);
    // 800px does not satisfy split-right (minWidth 1000) or mobile-stack (maxWidth 500)
    expect(result).toBeNull();
  });

  it('should be idempotent', () => {
    registerDefaultStrategies();
    registerDefaultStrategies();
    expect(layoutSelector.clear).toHaveBeenCalledTimes(2);
    expect(layoutSelector.register).toHaveBeenCalledTimes(8);
  });
});

describe('strategy 0: forced layout ignores constraints (Codex challenge)', () => {
  it('returns the forced id even when its constraints reject the viewport', () => {
    vi.clearAllMocks();
    // forced 布局 minWidth 9999，视口 375px——约束不满足也必须返回
    vi.mocked(layoutRegistry.has).mockReturnValue(true);
    vi.mocked(layoutRegistry.getMetadata).mockReturnValue({
      id: 'lab-stage',
      autoSelectable: false,
      constraints: { minWidth: 9999 }
    } as ReturnType<typeof layoutRegistry.getMetadata>);

    registerDefaultStrategies();
    const result = strategyAt(0)({
      forcedLayout: 'lab-stage',
      viewport: { width: 375, height: 812 },
      orientation: 'portrait'
    } as Parameters<LayoutSelectionStrategy>[0]);
    expect(result).toBe('lab-stage');
  });
});
