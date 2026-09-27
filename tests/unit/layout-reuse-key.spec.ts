import { describe, expect, it } from 'vitest';
import {
  layoutReuseKey,
  normalizeStructuralValue
} from '../../src/app/layouts/layout-reuse-key';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';

describe('layoutReuseKey', () => {
  it('includes primitive structural fields and omits functions', () => {
    const key = layoutReuseKey('split-right', {
      readoutCollapsed: true,
      readoutLabel: '读数',
      hideTransport: true,
      dataWorkspace: true,
      onResize: () => undefined
    } as Record<string, unknown>);
    expect(key).toContain('id=split-right');
    expect(key).toContain('"readoutCollapsed":true');
    expect(key).toContain('"readoutLabel":"读数"');
    expect(key).toContain('"hideTransport":true');
    expect(key).toContain('"dataWorkspace":true');
    expect(key).not.toContain('onResize');
  });

  it('changes when nested constructor-captured fields change', () => {
    const host = document.createElement('div');
    const collapsed = new SplitRightLayout(host, { readoutCollapsed: true });
    const expanded = new SplitRightLayout(host, { readoutCollapsed: false });
    expect(collapsed.getReuseKey()).toContain('readout-panel');
    expect(collapsed.getReuseKey()).not.toBe(expanded.getReuseKey());
    expect(collapsed.getReuseKey({ readoutCollapsed: false })).toBe(
      expanded.getReuseKey()
    );
  });

  it('includes nested capability declaration config', () => {
    const a = layoutReuseKey('split-right', {
      capabilities: [
        { id: 'readout-panel', config: { collapsed: true, label: 'A' } }
      ]
    } as Record<string, unknown>);
    const b = layoutReuseKey('split-right', {
      capabilities: [
        { id: 'readout-panel', config: { collapsed: false, label: 'A' } }
      ]
    } as Record<string, unknown>);
    expect(a).toContain('readout-panel');
    expect(a).not.toBe(b);
  });

  it('ignores runtime-only fields such as theme and preservedCanvas', () => {
    const canvas = document.createElement('canvas');
    const a = layoutReuseKey('split-right', {
      readoutCollapsed: true,
      theme: 'light',
      preservedCanvas: canvas,
      title: 'one'
    });
    const b = layoutReuseKey('split-right', {
      readoutCollapsed: true,
      theme: 'dark',
      preservedCanvas: null,
      title: 'two'
    });
    expect(a).toBe(b);
  });

  it('drops DOM nodes and callback references from nested records', () => {
    const normalized = normalizeStructuralValue({
      capabilities: [
        {
          id: 'resizer',
          config: {
            direction: 'vertical',
            onResize: () => 0,
            host: document.createElement('div')
          }
        }
      ]
    });
    expect(normalized).toEqual({
      capabilities: [
        {
          id: 'resizer',
          config: { direction: 'vertical' }
        }
      ]
    });
  });
});
