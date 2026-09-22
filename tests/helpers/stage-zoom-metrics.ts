import { expect, type Page } from '@playwright/test';

export type StageZoomMetrics = {
  zoom: number;
  boost: number;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasOffsetWidth: number;
  canvasOffsetHeight: number;
  canvasRectWidth: number;
  canvasRectHeight: number;
  slotOffsetWidth: number;
  slotOffsetHeight: number;
  slotRectWidth: number;
  slotRectHeight: number;
  viewportRectWidth: number;
  viewportRectHeight: number;
  opaquePixels: number;
  variedPixels: number;
};

const OPAQUE_PIXEL_THRESHOLD = 1000;

export async function readViewportZoom(
  page: Page,
  viewportSelector = '.stage-viewport'
): Promise<number> {
  return page.locator(viewportSelector).evaluate((el) => {
    const transform = (el as HTMLElement).style.transform;
    const match = transform.match(/scale\(([^)]+)\)/);
    return match ? Number(match[1]) : 1;
  });
}

export async function readStageZoomMetrics(
  page: Page,
  canvasSelector: string,
  slotSelector: string
): Promise<StageZoomMetrics> {
  return page.evaluate(
    ({ canvasSel, slotSel }) => {
      const canvas = document.querySelector(
        canvasSel
      ) as HTMLCanvasElement | null;
      const slot = document.querySelector(slotSel) as HTMLElement | null;
      const viewport = document.querySelector(
        '.stage-viewport'
      ) as HTMLElement | null;
      if (!canvas || !slot) {
        throw new Error('missing stage canvas or slot');
      }
      const transform = viewport?.style.transform ?? '';
      const match = transform.match(/scale\(([^)]+)\)/);
      const zoom = match ? Number(match[1]) : 1;
      const canvasRect = canvas.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const viewportRect = viewport?.getBoundingClientRect() ?? slotRect;
      const cssWidth = parseFloat(canvas.style.width || '0');
      const cssHeight = parseFloat(canvas.style.height || '0');

      let opaquePixels = 0;
      let variedPixels = 0;
      const ctx = canvas.getContext('2d');
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        const left = Math.max(canvasRect.left, slotRect.left);
        const top = Math.max(canvasRect.top, slotRect.top);
        const right = Math.min(canvasRect.right, slotRect.right);
        const bottom = Math.min(canvasRect.bottom, slotRect.bottom);
        const visW = Math.max(0, right - left);
        const visH = Math.max(0, bottom - top);
        const sx =
          canvasRect.width > 0
            ? ((left - canvasRect.left) / canvasRect.width) * canvas.width
            : 0;
        const sy =
          canvasRect.height > 0
            ? ((top - canvasRect.top) / canvasRect.height) * canvas.height
            : 0;
        const sw =
          canvasRect.width > 0 ? (visW / canvasRect.width) * canvas.width : 0;
        const sh =
          canvasRect.height > 0
            ? (visH / canvasRect.height) * canvas.height
            : 0;
        const x = Math.max(0, Math.floor(sx));
        const y = Math.max(0, Math.floor(sy));
        const w = Math.max(1, Math.min(canvas.width - x, Math.floor(sw) || 1));
        const h = Math.max(1, Math.min(canvas.height - y, Math.floor(sh) || 1));
        const data = ctx.getImageData(x, y, w, h).data;
        const r0 = data[0] ?? 0;
        const g0 = data[1] ?? 0;
        const b0 = data[2] ?? 0;
        const stride = Math.max(1, Math.floor(data.length / 4 / 80_000));
        for (let i = 0; i < data.length; i += 4 * stride) {
          const a = data[i + 3];
          if (a > 0) opaquePixels += 1;
          const dr = Math.abs(data[i] - r0);
          const dg = Math.abs(data[i + 1] - g0);
          const db = Math.abs(data[i + 2] - b0);
          if (dr + dg + db > 24) variedPixels += 1;
        }
      }

      return {
        zoom,
        boost: Number(canvas.dataset.renderBoost || '1'),
        dpr: window.devicePixelRatio || 1,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasCssWidth: cssWidth,
        canvasCssHeight: cssHeight,
        canvasOffsetWidth: canvas.offsetWidth,
        canvasOffsetHeight: canvas.offsetHeight,
        canvasRectWidth: canvasRect.width,
        canvasRectHeight: canvasRect.height,
        slotOffsetWidth: slot.offsetWidth,
        slotOffsetHeight: slot.offsetHeight,
        slotRectWidth: slotRect.width,
        slotRectHeight: slotRect.height,
        viewportRectWidth: viewportRect.width,
        viewportRectHeight: viewportRect.height,
        opaquePixels,
        variedPixels
      };
    },
    { canvasSel: canvasSelector, slotSel: slotSelector }
  );
}

/** Canvas layout CSS must stay at the slot size; only CSS zoom scales the visual box. */
export function expectCanvasLayoutNotInflated(metrics: StageZoomMetrics): void {
  expect(
    Math.abs(metrics.canvasOffsetWidth - metrics.slotOffsetWidth),
    `canvas.offsetWidth=${metrics.canvasOffsetWidth} slot.offsetWidth=${metrics.slotOffsetWidth}`
  ).toBeLessThanOrEqual(3);
  expect(
    Math.abs(metrics.canvasOffsetHeight - metrics.slotOffsetHeight),
    `canvas.offsetHeight=${metrics.canvasOffsetHeight} slot.offsetHeight=${metrics.slotOffsetHeight}`
  ).toBeLessThanOrEqual(3);
  if (metrics.canvasCssWidth > 0) {
    expect(
      Math.abs(metrics.canvasCssWidth - metrics.slotOffsetWidth),
      `canvas.style.width=${metrics.canvasCssWidth} slot.offsetWidth=${metrics.slotOffsetWidth}`
    ).toBeLessThanOrEqual(3);
  }
  const zoom = metrics.zoom || 1;
  const unscaledRectWidth = metrics.canvasRectWidth / zoom;
  expect(
    Math.abs(unscaledRectWidth - metrics.slotRectWidth),
    `canvas.getBoundingClientRect().width/zoom=${unscaledRectWidth} slot=${metrics.slotRectWidth}`
  ).toBeLessThanOrEqual(Math.max(4, metrics.slotRectWidth * 0.04));
}

export function expectCanvasNotBlank(metrics: StageZoomMetrics): void {
  expect(
    metrics.opaquePixels,
    `visible-region opaque pixels=${metrics.opaquePixels}`
  ).toBeGreaterThan(OPAQUE_PIXEL_THRESHOLD);
}

export async function waitForBoost(
  page: Page,
  canvasSelector: string,
  minBoost = 1.05
): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator(canvasSelector)
        .evaluate((el) =>
          Number((el as HTMLCanvasElement).dataset.renderBoost || '1')
        )
    )
    .toBeGreaterThanOrEqual(minBoost);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}
