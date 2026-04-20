import { describe, expect, it, beforeEach } from 'vitest';
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

  it('should return hardcoded fallback when no layouts available', () => {
    layoutSelector.register(() => null);

    const ctx = makeCtx({ availableLayouts: [] });
    expect(layoutSelector.select(ctx)).toBe('split-right');
  });

  it('should clear all strategies', () => {
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
