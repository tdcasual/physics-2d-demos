import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { ILayoutConstructor } from '../../src/app/layouts/types';
import {
  layoutRegistry,
  registerLayout,
  registerLazyLayout,
  registerLayoutTestAdapter,
  getDefaultLayoutId,
  saveLayoutPreference
} from '../../src/app/layouts/registry';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';

const FakeLayout = class {
  constructor() {}
} as unknown as ILayoutConstructor;

const fakeMeta = {
  name: 'Test',
  description: 'Test layout',
  tags: ['test'],
  supportsMobile: false,
  supportedSlots: ['header', 'control', 'animation'] as Array<
    'header' | 'control' | 'animation' | 'graph' | 'readout'
  >,
  layoutTestProfile: {
    viewports: [{ width: 800, height: 600 }],
    interactionModel: 'custom' as const,
    adapter: 'fake-adapter'
  }
};

beforeEach(() => {
  registerLayoutTestAdapter('fake-adapter');
});

describe('layoutRegistry', () => {
  beforeEach(() => {
    layoutRegistry.clear();
  });

  it('should register and create layout', async () => {
    layoutRegistry.register('test-layout', FakeLayout, fakeMeta);
    const container = document.createElement('div');
    const layout = await layoutRegistry.create('test-layout', container);
    expect(layout).toBeInstanceOf(FakeLayout);
  });

  it('should throw for unknown layout', async () => {
    const container = document.createElement('div');
    await expect(layoutRegistry.create('unknown', container)).rejects.toThrow(
      'Layout "unknown" not found'
    );
  });

  it('should throw for invalid id', () => {
    expect(() => layoutRegistry.register('', FakeLayout, fakeMeta)).toThrow(
      'Layout id must be a non-empty string'
    );
  });

  it('should throw for invalid constructor', () => {
    expect(() =>
      layoutRegistry.register(
        'bad',
        null as unknown as ILayoutConstructor,
        fakeMeta
      )
    ).toThrow('Layout constructor for "bad" must be a valid class/function');
  });

  it('should throw for invalid metadata', () => {
    expect(() =>
      layoutRegistry.register(
        'bad',
        FakeLayout,
        null as unknown as typeof fakeMeta
      )
    ).toThrow('Layout metadata for "bad" must be a valid object');
  });

  it('should require a test profile for every registered layout', () => {
    expect(() =>
      layoutRegistry.register('auto-layout', FakeLayout, {
        ...fakeMeta,
        layoutTestProfile: undefined
      })
    ).toThrow('must define layoutTestProfile');
  });

  it('should reject malformed test profiles', () => {
    expect(() =>
      layoutRegistry.register('bad-profile', FakeLayout, {
        ...fakeMeta,
        layoutTestProfile: {
          viewports: [],
          interactionModel: 'custom'
        }
      })
    ).toThrow('must define viewports');
  });

  it('should require an adapter for custom interaction models', () => {
    expect(() =>
      layoutRegistry.register('custom-layout', FakeLayout, {
        ...fakeMeta,
        supportedSlots: ['control', 'animation'],
        layoutTestProfile: {
          viewports: [{ width: 800, height: 600 }],
          interactionModel: 'custom'
        }
      })
    ).toThrow('must define adapter');
  });

  it('should reject an unregistered custom adapter', () => {
    expect(() =>
      layoutRegistry.register('custom-layout', FakeLayout, {
        ...fakeMeta,
        layoutTestProfile: {
          viewports: [{ width: 800, height: 600 }],
          interactionModel: 'custom',
          adapter: 'missing-adapter'
        }
      })
    ).toThrow('is not registered');
  });

  it('should accept a registered custom adapter', () => {
    registerLayoutTestAdapter('registered-adapter');
    expect(() =>
      layoutRegistry.register('custom-layout', FakeLayout, {
        ...fakeMeta,
        supportedSlots: ['control', 'animation'],
        layoutTestProfile: {
          viewports: [{ width: 800, height: 600 }],
          interactionModel: 'custom',
          adapter: 'registered-adapter'
        }
      })
    ).not.toThrow();
  });

  it('should throw for invalid container', async () => {
    layoutRegistry.register('test-layout', FakeLayout, fakeMeta);
    await expect(
      layoutRegistry.create('test-layout', null as unknown as HTMLElement)
    ).rejects.toThrow('Layout container must be a valid HTMLElement');
  });

  it('should list registered layouts', () => {
    layoutRegistry.register('a', FakeLayout, fakeMeta);
    layoutRegistry.register('b', FakeLayout, fakeMeta);
    expect(layoutRegistry.list()).toEqual(['a', 'b']);
  });

  it('should check if layout exists', () => {
    layoutRegistry.register('exists', FakeLayout, fakeMeta);
    expect(layoutRegistry.has('exists')).toBe(true);
    expect(layoutRegistry.has('missing')).toBe(false);
  });

  it('should get metadata', () => {
    layoutRegistry.register('meta-test', FakeLayout, {
      ...fakeMeta,
      name: 'Special'
    });
    const meta = layoutRegistry.getMetadata('meta-test');
    expect(meta?.name).toBe('Special');
    expect(meta?.id).toBe('meta-test');
  });

  it('should return undefined for missing metadata', () => {
    expect(layoutRegistry.getMetadata('none')).toBeUndefined();
  });

  it('should get all metadata', () => {
    layoutRegistry.register('m1', FakeLayout, fakeMeta);
    layoutRegistry.register('m2', FakeLayout, fakeMeta);
    expect(layoutRegistry.getAllMetadata()).toHaveLength(2);
  });

  it('should unregister layout', () => {
    layoutRegistry.register('gone', FakeLayout, fakeMeta);
    layoutRegistry.unregister('gone');
    expect(layoutRegistry.has('gone')).toBe(false);
  });

  it('should allow overwriting duplicate registration', () => {
    layoutRegistry.register('dup', FakeLayout, fakeMeta);
    expect(() =>
      layoutRegistry.register('dup', FakeLayout, fakeMeta)
    ).not.toThrow();
    expect(layoutRegistry.has('dup')).toBe(true);
  });

  it('should find layouts by tag', () => {
    layoutRegistry.register('tagged', FakeLayout, {
      ...fakeMeta,
      tags: ['special']
    });
    layoutRegistry.register('other', FakeLayout, {
      ...fakeMeta,
      tags: ['other']
    });
    expect(layoutRegistry.findByTag('special')).toHaveLength(1);
    expect(layoutRegistry.findByTag('special')[0].id).toBe('tagged');
  });

  it('should clear all layouts', () => {
    layoutRegistry.register('x', FakeLayout, fakeMeta);
    layoutRegistry.clear();
    expect(layoutRegistry.list()).toEqual([]);
  });
});

describe('registerLayout helper', () => {
  beforeEach(() => {
    layoutRegistry.clear();
  });

  it('should delegate to layoutRegistry.register', () => {
    registerLayout('helper', FakeLayout, fakeMeta);
    expect(layoutRegistry.has('helper')).toBe(true);
  });
});

describe('lazy layout registration', () => {
  beforeEach(() => {
    layoutRegistry.clear();
  });

  afterEach(() => {
    layoutRegistry.clear();
  });

  it('exposes metadata synchronously without invoking the loader', () => {
    const loader = vi.fn(() => FakeLayout);
    registerLazyLayout('lazy', loader, fakeMeta);

    expect(layoutRegistry.has('lazy')).toBe(true);
    expect(layoutRegistry.list()).toContain('lazy');
    expect(layoutRegistry.getMetadata('lazy')?.name).toBe('Test');
    expect(loader).not.toHaveBeenCalled();
  });

  it('loads the constructor on first create', async () => {
    const loader = vi.fn(async () => FakeLayout);
    registerLazyLayout('lazy', loader, fakeMeta);

    const container = document.createElement('div');
    const layout = await layoutRegistry.create('lazy', container);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(layout).toBeInstanceOf(FakeLayout);
  });

  it('shares one load across concurrent creates', async () => {
    let resolveLoader!: (ctor: ILayoutConstructor) => void;
    const loader = vi.fn(
      () =>
        new Promise<ILayoutConstructor>((resolve) => {
          resolveLoader = resolve;
        })
    );
    registerLazyLayout('lazy', loader, fakeMeta);

    const c1 = document.createElement('div');
    const c2 = document.createElement('div');
    const p1 = layoutRegistry.create('lazy', c1);
    const p2 = layoutRegistry.create('lazy', c2);
    // loader 在微任务中执行，等它被调用后再 resolve
    await vi.waitFor(() => expect(loader).toHaveBeenCalled());
    resolveLoader(FakeLayout);

    const [l1, l2] = await Promise.all([p1, p2]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(l1).toBeInstanceOf(FakeLayout);
    expect(l2).toBeInstanceOf(FakeLayout);
  });

  it('rejects when the loader does not resolve to a constructor', async () => {
    registerLazyLayout(
      'lazy',
      () => Promise.resolve(null as unknown as ILayoutConstructor),
      fakeMeta
    );
    const container = document.createElement('div');
    await expect(layoutRegistry.create('lazy', container)).rejects.toThrow(
      'did not resolve to a valid constructor'
    );
  });

  it('does not cache a failed load, allowing retry', async () => {
    let fail = true;
    const loader = vi.fn(() => {
      if (fail) return Promise.reject(new Error('network'));
      return Promise.resolve(FakeLayout);
    });
    registerLazyLayout('lazy', loader, fakeMeta);

    const container = document.createElement('div');
    await expect(layoutRegistry.create('lazy', container)).rejects.toThrow(
      'network'
    );

    fail = false;
    const layout = await layoutRegistry.create('lazy', container);
    expect(layout).toBeInstanceOf(FakeLayout);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('throws for an invalid loader', () => {
    expect(() =>
      registerLazyLayout(
        'bad-loader',
        null as unknown as () => ILayoutConstructor,
        fakeMeta
      )
    ).toThrow('Layout loader for "bad-loader" must be a valid function');
  });
});

describe('registerAllLayouts', () => {
  beforeEach(() => {
    layoutRegistry.clear();
  });

  afterEach(() => {
    layoutRegistry.clear();
  });

  it('should register split-right and mobile-stack', () => {
    registerAllLayouts();
    expect(layoutRegistry.list()).toContain('split-right');
    expect(layoutRegistry.list()).toContain('mobile-stack');
    expect(layoutRegistry.list()).toContain('lab-stage');
  });

  it('should provide a valid profile for every registered layout', () => {
    registerAllLayouts();

    for (const meta of layoutRegistry.getAllMetadata()) {
      expect(meta.layoutTestProfile).toBeDefined();
      expect(meta.layoutTestProfile!.viewports.length).toBeGreaterThan(0);
      expect(['tabs', 'split', 'stack', 'fullscreen', 'custom']).toContain(
        meta.layoutTestProfile!.interactionModel
      );
      expect(meta.supportedSlots).toEqual(
        expect.arrayContaining(['control', 'animation'])
      );
    }
  });

  it('should be idempotent', () => {
    registerAllLayouts();
    const first = layoutRegistry.list().length;
    registerAllLayouts();
    expect(layoutRegistry.list().length).toBe(first);
  });
});

describe('getDefaultLayoutId', () => {
  beforeEach(() => {
    layoutRegistry.clear();
    try {
      localStorage.removeItem('physics-demos-preferred-layout');
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    layoutRegistry.clear();
    try {
      localStorage.removeItem('physics-demos-preferred-layout');
    } catch {
      /* ignore */
    }
  });

  it('should return first available layout when no preference', () => {
    layoutRegistry.register('first', FakeLayout, fakeMeta);
    layoutRegistry.register('second', FakeLayout, fakeMeta);
    expect(getDefaultLayoutId()).toBe('first');
  });

  it('should return null when registry is empty', () => {
    expect(getDefaultLayoutId()).toBeNull();
  });

  it('should return user preference when valid', () => {
    layoutRegistry.register('preferred', FakeLayout, fakeMeta);
    saveLayoutPreference('preferred');
    expect(getDefaultLayoutId()).toBe('preferred');
  });

  it('should ignore invalid preference', () => {
    layoutRegistry.register('real', FakeLayout, fakeMeta);
    saveLayoutPreference('nonexistent');
    expect(getDefaultLayoutId()).toBe('real');
  });
});

describe('saveLayoutPreference', () => {
  afterEach(() => {
    try {
      localStorage.removeItem('physics-demos-preferred-layout');
    } catch {
      /* ignore */
    }
  });

  it('should save to localStorage as versioned schema', () => {
    saveLayoutPreference('my-layout');
    const raw = localStorage.getItem('physics-demos-preferred-layout');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(1);
    expect(parsed.layoutId).toBe('my-layout');
  });

  it('should migrate old plain string preference', () => {
    layoutRegistry.register('legacy', FakeLayout, fakeMeta);
    localStorage.setItem('physics-demos-preferred-layout', 'legacy');
    expect(getDefaultLayoutId()).toBe('legacy');
  });
});
