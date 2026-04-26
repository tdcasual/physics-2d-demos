import { vi, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Canvas 2D Context Mock
// ---------------------------------------------------------------------------

class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha = 1;

  fillRect = vi.fn();
  strokeRect = vi.fn();
  clearRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  stroke = vi.fn();
  fill = vi.fn();
  arc = vi.fn();
  arcTo = vi.fn();
  roundRect = vi.fn();
  setLineDash = vi.fn();
  getLineDash = vi.fn(() => []);
  fillText = vi.fn();
  strokeText = vi.fn();
  measureText = vi.fn(() => ({ width: 0 }));
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
  rotate = vi.fn();
  setTransform = vi.fn();
  closePath = vi.fn();
  clip = vi.fn();
  rect = vi.fn();
  createLinearGradient = vi.fn(() => ({
    addColorStop: vi.fn()
  }));
  createRadialGradient = vi.fn(() => ({
    addColorStop: vi.fn()
  }));
}

// ---------------------------------------------------------------------------
// Window / DOM Environment Augmentation (for happy-dom)
// ---------------------------------------------------------------------------

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;

  // devicePixelRatio
  if (w.devicePixelRatio === undefined) {
    w.devicePixelRatio = 1;
  }

  // matchMedia
  if (typeof w.matchMedia !== 'function') {
    w.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {}
    });
  }

  // requestAnimationFrame / cancelAnimationFrame
  if (typeof w.requestAnimationFrame !== 'function') {
    w.requestAnimationFrame = (fn: FrameRequestCallback) =>
      setTimeout(fn, 16) as unknown as number;
  }
  if (typeof w.cancelAnimationFrame !== 'function') {
    w.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  // localStorage polyfill for happy-dom
  const ls = (w as unknown as { localStorage?: Storage }).localStorage;
  if (!ls || typeof ls.getItem !== 'function') {
    const store: Record<string, string> = {};
    (w as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null
    } as Storage;
  }

  // Canvas 2D context interception
  const proto = (
    window as unknown as {
      HTMLCanvasElement: { prototype: Record<string, unknown> };
    }
  ).HTMLCanvasElement.prototype;
  if (proto && !proto._originalGetContext) {
    proto._originalGetContext = proto.getContext;
    proto.getContext = function (type: string, _attrs?: unknown) {
      if (type === '2d') {
        // Cache the mock context on the canvas element so that
        // renderer internals and test spies reference the same instance.
        const el = this as unknown as { __mockCtx2d?: unknown };
        if (!el.__mockCtx2d) {
          el.__mockCtx2d = new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
        }
        return el.__mockCtx2d as CanvasRenderingContext2D;
      }
      return (this._originalGetContext as (t: string, a?: unknown) => unknown)(
        type,
        _attrs
      );
    };
    proto.toDataURL = () => 'data:image/png;base64,';
  }
});
