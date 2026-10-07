import { describe, expect, it, vi } from 'vitest';
import {
  IDENTITY_ZOOM_VIEW,
  clampCanvasZoomView,
  createCanvasZoom,
  zoomCanvasViewAt
} from '../../src/platform/input/canvas-zoom';
import { STAGE_CHROME_ATTR } from '../../src/platform/stage-chrome';
import { createTickerTapeView } from '../../src/scenes/ticker-tape/scene.view';
import { createTickerTapeSim } from '../../src/scenes/ticker-tape/scene.sim';
import {
  fitStageTransform,
  zoomStageTransform
} from '../../src/scenes/projectile-data-analysis/scene.view';

describe('canvas zoom view math', () => {
  it('keeps the point under the pointer fixed while zooming', () => {
    // 画布 800×400，在 (500, 120) 处放大 4 倍：
    // 该点对应的内容点 p = (500, 120)，放大后 4·p + t 仍应是 (500, 120)
    const view = zoomCanvasViewAt(
      IDENTITY_ZOOM_VIEW,
      4,
      500,
      120,
      800,
      400,
      20
    );
    expect(view.k).toBe(4);
    expect(view.k * 500 + view.tx).toBeCloseTo(500, 9);
    expect(view.k * 120 + view.ty).toBeCloseTo(120, 9);
  });

  it('clamps the zoom to [1, max] and keeps the canvas covered', () => {
    expect(
      zoomCanvasViewAt(IDENTITY_ZOOM_VIEW, 100, 0, 0, 800, 400, 20).k
    ).toBe(20);
    expect(
      zoomCanvasViewAt(IDENTITY_ZOOM_VIEW, 0.1, 400, 200, 800, 400, 20)
    ).toEqual(IDENTITY_ZOOM_VIEW);
    // 2 倍时内容宽 1600：平移只能在 [−800, 0]
    expect(
      clampCanvasZoomView({ k: 2, tx: 300, ty: -900 }, 800, 400, 20)
    ).toEqual({ k: 2, tx: 0, ty: -400 });
    // 非法倍率不改变视图
    const view = { k: 2, tx: -10, ty: -10 };
    expect(zoomCanvasViewAt(view, Number.NaN, 0, 0, 800, 400, 20)).toBe(view);
  });

  it('composes with a fitted stage transform for crisp redraw', () => {
    const base = fitStageTransform(
      { left: -4, right: 46, top: -4, bottom: 47 },
      800,
      400
    );
    // 高度受限：400 px / 51 cm
    expect(base.pxPerCm).toBeCloseTo(400 / 51, 9);
    const t = zoomStageTransform(base, { k: 5, tx: -1200, ty: -300 });
    expect(t.pxPerCm).toBeCloseTo((5 * 400) / 51, 9);
    expect(t.cmX(t.px(12.34))).toBeCloseTo(12.34, 9);
    expect(t.cmY(t.py(7.5))).toBeCloseTo(7.5, 9);
  });
});

function mountCanvas(): { canvas: HTMLCanvasElement; host: HTMLElement } {
  const host = document.createElement('div');
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  document.body.appendChild(host);
  return { canvas, host };
}

describe('canvas zoom controller', () => {
  it('is inert until activated, then exposes named controls and a zoom readout', () => {
    const { canvas, host } = mountCanvas();
    const onChange = vi.fn();
    const zoom = createCanvasZoom({
      canvas,
      size: () => ({ width: 800, height: 400 }),
      maxZoom: () => 20,
      onChange
    });
    expect(zoom.view()).toEqual(IDENTITY_ZOOM_VIEW);
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -240 }));
    expect(onChange).not.toHaveBeenCalled();
    expect(host.querySelector('.stage-panzoom-controls')).toBeNull();

    zoom.setActive(true);
    const controls = host.querySelector('.stage-panzoom-controls')!;
    expect(controls.hasAttribute(STAGE_CHROME_ATTR)).toBe(true);
    expect(
      [...controls.querySelectorAll('button')].map((button) =>
        button.getAttribute('aria-label')
      )
    ).toEqual(['放大', '缩小', '复位视图']);
    expect(canvas.dataset.viewZoom).toBe('1.000');
    expect(canvas.style.touchAction).toBe('none');

    const [zoomIn, , reset] = [...controls.querySelectorAll('button')];
    zoomIn!.click();
    zoomIn!.click();
    expect(zoom.view().k).toBeCloseTo(2.25, 9);
    expect(canvas.dataset.viewZoom).toBe('2.250');
    expect(onChange).toHaveBeenCalledTimes(2);
    // 按钮以画布中心为不动点
    expect(zoom.view().k * 400 + zoom.view().tx).toBeCloseTo(400, 9);

    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -240 }));
    expect(zoom.view().k).toBeGreaterThan(2.25);
    reset!.click();
    expect(zoom.view()).toEqual(IDENTITY_ZOOM_VIEW);

    zoom.setActive(false);
    expect(host.querySelector('.stage-panzoom-controls')).toBeNull();
    expect(canvas.dataset.viewZoom).toBeUndefined();
    expect(canvas.style.touchAction).toBe('');
    zoom.dispose();
    host.remove();
  });

  it('follows the canvas to a new parent and cleans up on dispose', () => {
    const { canvas, host } = mountCanvas();
    const zoom = createCanvasZoom({
      canvas,
      size: () => ({ width: 800, height: 400 }),
      maxZoom: () => 20,
      onChange() {}
    });
    zoom.setActive(true);
    const next = document.createElement('div');
    document.body.appendChild(next);
    next.appendChild(canvas);
    zoom.view();
    expect(host.querySelector('.stage-panzoom-controls')).toBeNull();
    expect(next.querySelector('.stage-panzoom-controls')).not.toBeNull();
    zoom.dispose();
    expect(next.querySelector('.stage-panzoom-controls')).toBeNull();
    host.remove();
    next.remove();
  });
});

describe('ticker-tape reading zoom', () => {
  it('zooms in the workspace and blocks the ruler drag there', () => {
    const { canvas, host } = mountCanvas();
    const view = createTickerTapeView({ canvas });
    const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'off' });
    const onOriginDrag = vi.fn();
    view.setOnOriginDrag(onOriginDrag);
    view.render(sim.getState());

    view.setWorkspaceActive(true);
    expect(canvas.dataset.viewZoom).toBe('1.000');
    host.querySelector<HTMLButtonElement>('[aria-label="放大"]')!.click();
    expect(Number(canvas.dataset.viewZoom)).toBeCloseTo(1.5, 3);
    // 工作区里按在尺上拖：只平移视图，不改计时起点
    const x = Number(canvas.dataset.originPx ?? 0);
    const y = Number(canvas.dataset.rulerMidY ?? 0);
    const down = new PointerEvent('pointerdown', { pointerId: 1 });
    Object.defineProperties(down, {
      offsetX: { value: x },
      offsetY: { value: y }
    });
    canvas.dispatchEvent(down);
    expect(onOriginDrag).not.toHaveBeenCalled();

    view.setWorkspaceActive(false);
    expect(canvas.dataset.viewZoom).toBeUndefined();
    expect(host.querySelector('.stage-panzoom-controls')).toBeNull();
    view.dispose();
    host.remove();
  });
});
