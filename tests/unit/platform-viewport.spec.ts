import { afterEach, describe, expect, it } from 'vitest';
import {
  getResponsiveViewport,
  resolveResponsiveStageWidth
} from '../../src/platform/viewport';

// ---------------------------------------------------------------------------
// window 尺寸属性的存取/恢复工具
// happy-dom 中 innerWidth/innerHeight/visualViewport 可能定义在原型上，
// 这里只对 window 本身设置/还原 own property，避免污染其他测试文件。
// ---------------------------------------------------------------------------

const WINDOW_PROPS = ['innerWidth', 'innerHeight', 'visualViewport'] as const;

const originalDescriptors = new Map<string, PropertyDescriptor | undefined>(
  WINDOW_PROPS.map((key) => [key, Object.getOwnPropertyDescriptor(window, key)])
);

afterEach(() => {
  for (const key of WINDOW_PROPS) {
    const desc = originalDescriptors.get(key);
    if (desc) {
      Object.defineProperty(window, key, desc);
    } else {
      delete (window as unknown as Record<string, unknown>)[key];
    }
  }
});

function setWindowSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
    writable: true
  });
}

function setVisualViewport(
  value: { width: number; height: number } | undefined
): void {
  Object.defineProperty(window, 'visualViewport', {
    value,
    configurable: true,
    writable: true
  });
}

function makeHost(clientWidth: number, rectWidth = 0): HTMLElement {
  const host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', {
    value: clientWidth,
    configurable: true
  });
  host.getBoundingClientRect = () =>
    ({
      width: rectWidth,
      height: 0,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: rectWidth,
      bottom: 0,
      toJSON: () => ({})
    }) as DOMRect;
  return host;
}

describe('platform viewport', () => {
  describe('getResponsiveViewport', () => {
    it('returns floored window size with narrow flag at default breakpoint', () => {
      setWindowSize(1180, 800);
      setVisualViewport(undefined);
      const vp = getResponsiveViewport();
      expect(vp.width).toBe(1180);
      expect(vp.height).toBe(800);
      expect(vp.isNarrow).toBe(true);
    });

    it('isNarrow is false one pixel above the default breakpoint', () => {
      setWindowSize(1181, 800);
      setVisualViewport(undefined);
      expect(getResponsiveViewport().isNarrow).toBe(false);
    });

    it('honours a custom narrow breakpoint', () => {
      setWindowSize(700, 800);
      setVisualViewport(undefined);
      expect(getResponsiveViewport(600).isNarrow).toBe(false);
      expect(getResponsiveViewport(700).isNarrow).toBe(true);
    });

    it('prefers window.visualViewport when it is valid', () => {
      setWindowSize(1024, 768);
      setVisualViewport({ width: 390.6, height: 844.2 });
      const vp = getResponsiveViewport();
      expect(vp.width).toBe(390);
      expect(vp.height).toBe(844);
      expect(vp.isNarrow).toBe(true);
    });

    it.each([
      { label: 'zero', vv: { width: 0, height: 0 } },
      { label: 'negative', vv: { width: -10, height: -5 } },
      { label: 'non-finite', vv: { width: NaN, height: Infinity } }
    ])(
      'falls back to innerWidth/innerHeight when visualViewport is $label',
      ({ vv }) => {
        setWindowSize(1280, 720);
        setVisualViewport(vv);
        const vp = getResponsiveViewport();
        expect(vp.width).toBe(1280);
        expect(vp.height).toBe(720);
      }
    );

    it('clamps degenerate viewport sizes to at least 1px', () => {
      setWindowSize(0.4, 0);
      setVisualViewport(undefined);
      const vp = getResponsiveViewport();
      expect(vp.width).toBe(1);
      expect(vp.height).toBe(1);
    });
  });

  describe('resolveResponsiveStageWidth', () => {
    it('uses host width minus padding when host is the tighter constraint', () => {
      setWindowSize(1000, 800);
      setVisualViewport(undefined);
      expect(resolveResponsiveStageWidth(makeHost(500))).toBe(484);
    });

    it('uses viewport width minus padding when viewport is tighter', () => {
      setWindowSize(400, 800);
      setVisualViewport(undefined);
      expect(resolveResponsiveStageWidth(makeHost(500))).toBe(384);
    });

    it('never returns less than minWidthPx', () => {
      setWindowSize(300, 800);
      setVisualViewport(undefined);
      expect(resolveResponsiveStageWidth(makeHost(200))).toBe(320);
    });

    it('honours custom minWidthPx and horizontalPaddingPx', () => {
      setWindowSize(1000, 800);
      setVisualViewport(undefined);
      const width = resolveResponsiveStageWidth(makeHost(500), {
        minWidthPx: 100,
        horizontalPaddingPx: 40
      });
      expect(width).toBe(460);
    });

    it('custom minWidthPx also floors the result', () => {
      setWindowSize(120, 800);
      setVisualViewport(undefined);
      const width = resolveResponsiveStageWidth(makeHost(110), {
        minWidthPx: 200,
        horizontalPaddingPx: 16
      });
      expect(width).toBe(200);
    });

    it('falls back to getBoundingClientRect width when clientWidth is 0', () => {
      setWindowSize(1000, 800);
      setVisualViewport(undefined);
      expect(resolveResponsiveStageWidth(makeHost(0, 600))).toBe(584);
    });

    it('falls back to viewport width when host reports no size', () => {
      setWindowSize(800, 600);
      setVisualViewport(undefined);
      expect(resolveResponsiveStageWidth(makeHost(0, 0))).toBe(784);
    });

    it('respects a custom narrow breakpoint without affecting the width math', () => {
      setWindowSize(500, 800);
      setVisualViewport(undefined);
      const host = makeHost(500);
      expect(
        resolveResponsiveStageWidth(host, { narrowBreakpointPx: 300 })
      ).toBe(484);
    });
  });
});
