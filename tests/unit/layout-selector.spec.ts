import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  layoutSelector,
  type LayoutSelectionContext
} from '../../src/app/layouts/selector';

describe('LayoutSelector', () => {
  beforeEach(() => {
    layoutSelector.clear();
  });

  function makeCtx(
    partial: Partial<LayoutSelectionContext> = {}
  ): LayoutSelectionContext {
    return {
      viewport: { width: 1200, height: 800 },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      orientation: 'landscape',
      userPreference: null,
      scenePreference: null,
      availableLayouts: [
        {
          id: 'split-right',
          name: 'Split Right',
          description: '',
          tags: [],
          supportsMobile: true,
          supportedSlots: ['header', 'control', 'animation']
        },
        {
          id: 'mobile-stack',
          name: 'Mobile Stack',
          description: '',
          tags: [],
          supportsMobile: true,
          supportedSlots: ['header', 'control', 'animation']
        }
      ],
      ...partial
    };
  }

  it('should return fallback when no strategies registered', () => {
    const ctx = makeCtx();
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });

  it('should use first strategy that returns a valid layout ID', () => {
    layoutSelector.register(() => 'mobile-stack');
    layoutSelector.register(() => 'split-right');

    const ctx = makeCtx();
    expect(layoutSelector.select(ctx)).toBe('mobile-stack');
  });

  it('should skip strategy returning invalid layout ID', () => {
    layoutSelector.register(() => 'nonexistent');
    layoutSelector.register(() => 'mobile-stack');

    const ctx = makeCtx();
    expect(layoutSelector.select(ctx)).toBe('mobile-stack');
  });

  it('should skip strategy returning null', () => {
    layoutSelector.register(() => null);
    layoutSelector.register(() => 'mobile-stack');

    const ctx = makeCtx();
    expect(layoutSelector.select(ctx)).toBe('mobile-stack');
  });

  it('should return user preference when strategy returns it', () => {
    layoutSelector.register((ctx) => ctx.userPreference);

    const ctx = makeCtx({ userPreference: 'mobile-stack' });
    expect(layoutSelector.select(ctx)).toBe('mobile-stack');
  });

  it('should fall back to first available layout if all strategies fail', () => {
    layoutSelector.register(() => null);

    const ctx = makeCtx({
      availableLayouts: [
        {
          id: 'fallback',
          name: 'Fallback',
          description: '',
          tags: [],
          supportsMobile: true,
          supportedSlots: []
        }
      ]
    });
    expect(layoutSelector.select(ctx)).toBe('fallback');
  });

  it('should throw when no layouts available', () => {
    layoutSelector.register(() => null);

    const ctx = makeCtx({ availableLayouts: [] });
    expect(() => layoutSelector.select(ctx)).toThrow('No layouts available');
  });

  it('should clear all strategies and fallback to first available', () => {
    layoutSelector.register(() => 'mobile-stack');
    layoutSelector.clear();

    const ctx = makeCtx();
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });
});

describe('registerDefaultStrategies', () => {
  it('should register strategies without error', async () => {
    const { registerDefaultStrategies } =
      await import('../../src/app/layouts/default-strategies');
    layoutSelector.clear();
    expect(() => registerDefaultStrategies()).not.toThrow();
  });
});

describe('default strategies: preference constraints & forced layout (Fix 1)', () => {
  let registerAllLayouts: typeof import('../../src/app/layouts/auto-register').registerAllLayouts;
  let registerDefaultStrategies: typeof import('../../src/app/layouts/default-strategies').registerDefaultStrategies;
  let layoutRegistry: typeof import('../../src/app/layouts/registry').layoutRegistry;

  const makeMetaCtx = (
    partial: Partial<LayoutSelectionContext>
  ): LayoutSelectionContext => ({
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
    userPreference: null,
    scenePreference: null,
    availableLayouts: layoutRegistry.getAllMetadata(),
    ...partial
  });

  beforeEach(async () => {
    // 真实 registry + 真实布局元数据（约束来自 auto-register 声明）
    ({ registerAllLayouts } =
      await import('../../src/app/layouts/auto-register'));
    ({ registerDefaultStrategies } =
      await import('../../src/app/layouts/default-strategies'));
    ({ layoutRegistry } = await import('../../src/app/layouts/registry'));
    registerAllLayouts();
    registerDefaultStrategies();
  });

  afterEach(() => {
    layoutSelector.clear();
  });

  it('keeps a satisfied user preference over scene preference (strategy 1 wins)', () => {
    // split-right minWidth 768，1280px 满足约束 → 偏好生效
    const ctx = makeMetaCtx({ userPreference: 'split-right' });
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });

  it('drops a constraint-violating preference and falls through to auto match', () => {
    // split-right-graph-bottom minWidth 900；375px 违反 → 落入自动匹配
    //（mobile-stack maxWidth 768 满足且 autoSelectable）→ 不再钉死
    const ctx = makeMetaCtx({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      orientation: 'portrait',
      userPreference: 'split-right-graph-bottom',
      scenePreference: 'split-right'
    });
    expect(layoutSelector.select(ctx)).toBe('mobile-stack');
  });

  it('prefers a satisfied scene preference when no user preference exists', () => {
    const ctx = makeMetaCtx({ scenePreference: 'split-right' });
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });

  it('lets forcedLayout override both preference and scene preference', () => {
    const ctx = makeMetaCtx({
      forcedLayout: 'lab-stage',
      userPreference: 'split-right',
      scenePreference: 'split-right'
    });
    expect(layoutSelector.select(ctx)).toBe('lab-stage');
  });

  it('ignores an unregistered forcedLayout', () => {
    const ctx = makeMetaCtx({
      forcedLayout: 'nonexistent-layout',
      userPreference: 'split-right'
    });
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });
});
