import type { GraphDrawContext } from './types';

export function drawGraphs(context: GraphDrawContext): void {
  const { xCtx, vCtx, xW, xH, vW, vH, visualScale, snapshot } = context;

  xCtx.clearRect(0, 0, xW, xH);
  vCtx.clearRect(0, 0, vW, vH);

  const paddingLeft = 40 * visualScale;
  const paddingBottom = 30 * visualScale;
  const paddingTop = 10 * visualScale;
  const paddingRight = 10 * visualScale;

  const drawAxis = (
    target: CanvasRenderingContext2D,
    w: number,
    h: number,
    yLabel: string
  ): void => {
    target.save();
    target.strokeStyle = 'rgba(148,163,184,0.8)';
    target.lineWidth = Math.max(2.5 * visualScale, 1.4 * visualScale);
    target.beginPath();
    target.moveTo(paddingLeft, paddingTop);
    target.lineTo(paddingLeft, h - paddingBottom);
    target.lineTo(w - paddingRight, h - paddingBottom);
    target.stroke();

    target.font = `${Math.max(14, Math.round(12 * visualScale))}px system-ui`;
    target.fillStyle = 'rgba(148,163,184,0.9)';
    target.textAlign = 'left';
    target.fillText(yLabel, 6, paddingTop + 12 * visualScale);
    target.textAlign = 'right';
    target.fillText('t / s', w - 6, h - 6);
    target.restore();
  };

  drawAxis(xCtx, xW, xH, 'x / m');
  drawAxis(vCtx, vW, vH, 'v / (m·s⁻¹)');

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
    target.strokeStyle = 'rgba(148,163,184,0.25)';
    target.lineWidth = Math.max(2.5 * visualScale, 1.2 * visualScale);
    target.setLineDash([4 * visualScale, 4 * visualScale]);
    target.font = `${Math.max(13, Math.round(11 * visualScale))}px system-ui`;
    target.fillStyle = 'rgba(148,163,184,0.9)';

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

  drawGrid(xCtx, xW, xH);
  drawGrid(vCtx, vW, vH);

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
    const grad = target.createLinearGradient(
      paddingLeft,
      paddingTop,
      w - paddingRight,
      h - paddingBottom
    );
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    target.strokeStyle = grad;
    target.beginPath();
    let first = true;
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
    }
    target.stroke();
    target.restore();
  };

  drawPolyline(
    xCtx, xW, xH,
    'xA',
    'rgba(96,165,250,0.95)',
    'rgba(59,130,246,0.5)',
    currentTime
  );
  drawPolyline(
    xCtx, xW, xH,
    'xB',
    'rgba(248,113,113,0.95)',
    'rgba(239,68,68,0.5)',
    currentTime
  );
  drawPolyline(
    vCtx, vW, vH,
    'vA',
    'rgba(96,165,250,0.95)',
    'rgba(59,130,246,0.5)',
    currentTime
  );
  drawPolyline(
    vCtx, vW, vH,
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
    target.strokeStyle = 'rgba(248,250,252,0.85)';
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
