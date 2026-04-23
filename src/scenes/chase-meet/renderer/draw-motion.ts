import type { MotionDrawContext } from './types';
import { nearestSample } from './view-utils';

export function drawMotion(context: MotionDrawContext): void {
  const { ctx, cssW, cssH, visualScale, snapshot, theme } = context;
  const isLight = theme === 'light';

  ctx.clearRect(0, 0, cssW, cssH);

  const grad = ctx.createLinearGradient(0, 0, cssW, cssH);
  if (isLight) {
    grad.addColorStop(0, '#e5f0ff');
    grad.addColorStop(1, '#d1d5db');
  } else {
    grad.addColorStop(0, '#020617');
    grad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cssW, cssH);

  const mid = cssH * 0.55;
  const majorStroke = Math.max(2, 2 * visualScale);
  const minorStroke = Math.max(1.5, 1.5 * visualScale);

  ctx.strokeStyle = isLight
    ? 'rgba(15,23,42,0.35)'
    : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(majorStroke, 3 * visualScale);
  ctx.beginPath();
  ctx.moveTo(20, mid);
  ctx.lineTo(cssW - 20, mid);
  ctx.stroke();

  ctx.font = `${Math.max(14, Math.round(12 * visualScale))}px system-ui`;
  ctx.fillStyle = isLight
    ? 'rgba(30,41,59,0.8)'
    : 'rgba(226,232,240,0.8)';
  ctx.textAlign = 'center';
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const x = 20 + (cssW - 40) * ratio;
    const worldX =
      snapshot.bounds.minX + ratio * (snapshot.bounds.maxX - snapshot.bounds.minX);
    ctx.beginPath();
    ctx.moveTo(x, mid - 6 * visualScale);
    ctx.lineTo(x, mid + 6 * visualScale);
    ctx.stroke();
    ctx.fillText(worldX.toFixed(1), x, mid + 20 * visualScale);
  }

  const current = nearestSample(snapshot.samples, snapshot.state.t);
  const padding = 40;
  const usable = cssW - 2 * padding;
  const screenXA =
    padding +
    ((current.xA - snapshot.bounds.minX) /
      (snapshot.bounds.maxX - snapshot.bounds.minX)) *
      usable;
  const screenXB =
    padding +
    ((current.xB - snapshot.bounds.minX) /
      (snapshot.bounds.maxX - snapshot.bounds.minX)) *
      usable;

  const drawObject = (x: number, color: string, label: string): void => {
    const r = Math.max(16 * visualScale, 12 * 2.6 * visualScale);
    const glowColor = color.replace('1)', '0.23)');
    ctx.beginPath();
    ctx.fillStyle = glowColor;
    ctx.arc(x, mid, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, mid, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(majorStroke, 3 * visualScale);
    ctx.strokeStyle = isLight
      ? 'rgba(15,23,42,0.9)'
      : 'rgba(248,250,252,0.95)';
    ctx.stroke();

    ctx.fillStyle = isLight ? '#111827' : '#f9fafb';
    ctx.font = `bold ${Math.max(18, Math.round(15 * visualScale))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, mid - 22 * visualScale);
  };

  drawObject(screenXA, 'rgba(96,165,250,1)', 'A');
  drawObject(screenXB, 'rgba(248,113,113,1)', 'B');

  ctx.setLineDash([6 * visualScale, 4 * visualScale]);
  ctx.strokeStyle = isLight
    ? 'rgba(30,64,175,0.7)'
    : 'rgba(148,163,184,0.7)';
  ctx.lineWidth = Math.max(minorStroke, 2.5 * visualScale);
  ctx.beginPath();
  ctx.moveTo(screenXA, mid);
  ctx.lineTo(screenXB, mid);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = isLight ? '#111827' : '#f9fafb';
  ctx.font = `${Math.max(13, Math.round(13 * visualScale))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `距离 = ${Math.abs(current.xB - current.xA).toFixed(2)} m`,
    (screenXA + screenXB) / 2,
    mid - 34 * visualScale
  );
}
