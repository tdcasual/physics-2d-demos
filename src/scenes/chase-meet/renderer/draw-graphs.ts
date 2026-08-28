import type { GraphDrawContext } from './types';

// 折线描边渐变缓存：key 为几何参数 + 颜色，几何随尺寸/visualScale 变化，失效才重建
const polylineGradientCache = new Map<string, CanvasGradient>();

// 图表静态层（坐标轴 + 虚线网格 + 刻度文本）离屏缓存：
// 静态于 (totalTime, 画布设备尺寸, theme, visualScale)，命中时按设备像素
// 1:1 blit（原点 (0,0)、目标设备尺寸与离屏一致，无重采样，像素级一致），
// 每帧只需重画折线/动点/时间游标。
// 单测的 mock ctx 没有 .canvas（无法确定设备像素尺寸），回退为直接绘制。
type StaticLayerCache = {
  key: string;
  canvas: HTMLCanvasElement;
};
let xStaticCache: StaticLayerCache | null = null;
let vStaticCache: StaticLayerCache | null = null;

function drawStaticLayer(
  target: CanvasRenderingContext2D,
  w: number,
  h: number,
  key: string,
  slot: 'x' | 'v',
  paint: (c: CanvasRenderingContext2D) => void
): void {
  const srcCanvas = target.canvas as HTMLCanvasElement | undefined;
  const devW = srcCanvas?.width ?? 0;
  const devH = srcCanvas?.height ?? 0;
  if (!srcCanvas || devW < 1 || devH < 1 || w < 1 || h < 1) {
    paint(target);
    return;
  }
  const dpr = devW / w;
  const fullKey = `${key}|${devW}|${devH}|${dpr}`;
  let cache = slot === 'x' ? xStaticCache : vStaticCache;
  if (!cache || cache.key !== fullKey) {
    const off = document.createElement('canvas');
    off.width = devW;
    off.height = devH;
    const oc = off.getContext('2d');
    if (!oc) {
      paint(target);
      return;
    }
    oc.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(oc);
    cache = { key: fullKey, canvas: off };
    if (slot === 'x') xStaticCache = cache;
    else vStaticCache = cache;
  }
  // devW/dpr === w（dpr 由同一比值推出），目标设备区域与离屏像素 1:1 对齐
  target.drawImage(cache.canvas, 0, 0, devW / dpr, devH / dpr);
}

function cachedPolylineGradient(
  target: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colorA: string,
  colorB: string
): CanvasGradient {
  const key = `${x0}|${y0}|${x1}|${y1}|${colorA}|${colorB}`;
  const hit = polylineGradientCache.get(key);
  if (hit) return hit;
  const grad = target.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  polylineGradientCache.set(key, grad);
  return grad;
}

export function drawGraphs(context: GraphDrawContext): void {
  const { xCtx, vCtx, xW, xH, vW, vH, visualScale, snapshot, theme } = context;
  const isLight = theme === 'light';

  xCtx.clearRect(0, 0, xW, xH);
  vCtx.clearRect(0, 0, vW, vH);

  const paddingLeft = 40 * visualScale;
  const paddingBottom = 30 * visualScale;
  const paddingTop = 10 * visualScale;
  const paddingRight = 10 * visualScale;

  const axisColor = isLight ? 'rgba(51,65,85,0.7)' : 'rgba(148,163,184,0.8)';
  const labelColor = isLight ? 'rgba(30,41,59,0.85)' : 'rgba(226,232,240,0.9)';
  const gridColor = isLight ? 'rgba(71,85,105,0.18)' : 'rgba(148,163,184,0.25)';
  const markerColor = isLight
    ? 'rgba(30,41,59,0.55)'
    : 'rgba(248,250,252,0.65)';

  const drawAxis = (
    target: CanvasRenderingContext2D,
    w: number,
    h: number,
    yLabel: string
  ): void => {
    target.save();
    target.strokeStyle = axisColor;
    target.lineWidth = Math.max(2.5 * visualScale, 1.4 * visualScale);
    target.beginPath();
    target.moveTo(paddingLeft, paddingTop);
    target.lineTo(paddingLeft, h - paddingBottom);
    target.lineTo(w - paddingRight, h - paddingBottom);
    target.stroke();

    target.font = `${Math.max(14, Math.round(12 * visualScale))}px system-ui`;
    target.fillStyle = labelColor;
    target.textAlign = 'left';
    target.fillText(yLabel, 6, paddingTop + 12 * visualScale);
    target.textAlign = 'right';
    target.fillText('t / s', w - 6, h - 6);
    target.restore();
  };

  const minT = 0;
  const maxT = snapshot.params.totalTime;
  const tRange = maxT - minT || 1;

  const minX = snapshot.bounds.minX;
  const maxX = snapshot.bounds.maxX;
  const xRange = maxX - minX || 1;

  let maxV = snapshot.bounds.maxSpeed || 1;
  maxV *= 1.1;
  const minV = -maxV;
  const vRange = maxV - minV || 1;
  const currentTime = snapshot.state.t;

  const tToXpix = (tVal: number, w: number): number =>
    paddingLeft + ((tVal - minT) / tRange) * (w - paddingLeft - paddingRight);
  const worldXToYpix = (xVal: number, h: number): number =>
    paddingTop + ((maxX - xVal) / xRange) * (h - paddingTop - paddingBottom);
  const vToYpix = (vVal: number, h: number): number =>
    paddingTop + ((maxV - vVal) / vRange) * (h - paddingTop - paddingBottom);

  const drawGrid = (
    target: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void => {
    target.save();
    target.strokeStyle = gridColor;
    target.lineWidth = Math.max(2.5 * visualScale, 1.2 * visualScale);
    target.setLineDash([4 * visualScale, 4 * visualScale]);
    target.font = `${Math.max(13, Math.round(11 * visualScale))}px system-ui`;
    target.fillStyle = labelColor;

    const step = Math.max(1, Math.round(snapshot.params.totalTime / 5));
    for (let tv = 0; tv <= snapshot.params.totalTime + 1e-6; tv += step) {
      const x = tToXpix(tv, w);
      target.beginPath();
      target.moveTo(x, paddingTop);
      target.lineTo(x, h - paddingBottom);
      target.stroke();
      target.textAlign = 'center';
      target.fillText(tv.toFixed(0), x, h - 10 * visualScale);
    }

    target.setLineDash([]);
    target.restore();
  };

  // 静态层（坐标轴 + 虚线网格 + 刻度）：key 覆盖其全部输入
  // （totalTime → 网格步长/刻度、尺寸与 dpr 由 drawStaticLayer 内部并入、
  // theme → 颜色、visualScale → 线宽/字号）
  const staticKey = `${theme}|${visualScale}|${snapshot.params.totalTime}`;
  drawStaticLayer(xCtx, xW, xH, staticKey, 'x', (c) => {
    drawAxis(c, xW, xH, 'x / m');
    drawGrid(c, xW, xH);
  });
  drawStaticLayer(vCtx, vW, vH, staticKey, 'v', (c) => {
    drawAxis(c, vW, vH, 'v / (m·s⁻¹)');
    drawGrid(c, vW, vH);
  });

  const drawPolyline = (
    target: CanvasRenderingContext2D,
    w: number,
    h: number,
    type: 'xA' | 'xB' | 'vA' | 'vB',
    colorA: string,
    colorB: string,
    maxTime: number
  ): void => {
    target.save();
    target.lineWidth = Math.max(3 * visualScale, 2.6 * visualScale);
    const grad = cachedPolylineGradient(
      target,
      paddingLeft,
      paddingTop,
      w - paddingRight,
      h - paddingBottom,
      colorA,
      colorB
    );
    target.strokeStyle = grad;
    target.beginPath();
    let first = true;
    let lastX = 0;
    let lastY = 0;
    let drew = false;
    for (const s of snapshot.samples) {
      if (s.t > maxTime) break;
      const xPix = tToXpix(s.t, w);
      let yPix: number;
      if (type === 'xA') yPix = worldXToYpix(s.xA, h);
      else if (type === 'xB') yPix = worldXToYpix(s.xB, h);
      else if (type === 'vA') yPix = vToYpix(s.vA, h);
      else yPix = vToYpix(s.vB, h);
      if (first) {
        target.moveTo(xPix, yPix);
        first = false;
      } else {
        target.lineTo(xPix, yPix);
      }
      lastX = xPix;
      lastY = yPix;
      drew = true;
    }
    target.stroke();
    // 当前时刻点（活的反馈）
    if (drew) {
      target.fillStyle = colorA;
      target.beginPath();
      target.arc(lastX, lastY, Math.max(3, 4 * visualScale), 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = isLight ? '#ffffff' : '#0f172a';
      target.lineWidth = Math.max(1.5, 2 * visualScale);
      target.stroke();
    }
    target.restore();
  };

  drawPolyline(
    xCtx,
    xW,
    xH,
    'xA',
    'rgba(96,165,250,0.95)',
    'rgba(59,130,246,0.5)',
    currentTime
  );
  drawPolyline(
    xCtx,
    xW,
    xH,
    'xB',
    'rgba(248,113,113,0.95)',
    'rgba(239,68,68,0.5)',
    currentTime
  );
  drawPolyline(
    vCtx,
    vW,
    vH,
    'vA',
    'rgba(96,165,250,0.95)',
    'rgba(59,130,246,0.5)',
    currentTime
  );
  drawPolyline(
    vCtx,
    vW,
    vH,
    'vB',
    'rgba(248,113,113,0.95)',
    'rgba(239,68,68,0.5)',
    currentTime
  );

  const drawMarker = (
    target: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void => {
    const x = tToXpix(currentTime, w);
    target.save();
    target.strokeStyle = markerColor;
    target.setLineDash([6 * visualScale, 4 * visualScale]);
    target.lineWidth = Math.max(2.5 * visualScale, 1.9 * visualScale);
    target.beginPath();
    target.moveTo(x, paddingTop);
    target.lineTo(x, h - paddingBottom);
    target.stroke();
    target.restore();
  };

  drawMarker(xCtx, xW, xH);
  drawMarker(vCtx, vW, vH);
}
