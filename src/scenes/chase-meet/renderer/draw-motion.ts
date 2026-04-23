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

  const drawCar = (
    x: number,
    color: string,
    label: string,
    velocity: number
  ): void => {
    const s = visualScale;
    const facingRight = velocity >= 0;

    ctx.save();
    ctx.translate(x, mid);
    if (!facingRight) {
      ctx.scale(-1, 1);
    }

    // 车身尺寸参数
    const carW = 52 * s;
    const carH = 22 * s;
    const wheelR = 7 * s;
    const wheelOffsetX = 14 * s;

    // 底部阴影/光晕
    const glowColor = color.replace('1)', '0.18)');
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, carH * 0.5 + 2 * s, carW * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 车身主体（下半部分）
    const bodyY = -carH * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-carW * 0.5, bodyY + carH * 0.6);
    ctx.lineTo(-carW * 0.5, bodyY);
    ctx.lineTo(carW * 0.5, bodyY);
    ctx.lineTo(carW * 0.5, bodyY + carH * 0.6);
    ctx.closePath();
    ctx.fill();

    // 车顶（上半部分，梯形）
    const roofW = carW * 0.55;
    const roofH = carH * 0.5;
    const roofY = bodyY - roofH;
    ctx.beginPath();
    ctx.moveTo(-roofW * 0.5, bodyY);
    ctx.lineTo(-roofW * 0.35, roofY);
    ctx.lineTo(roofW * 0.35, roofY);
    ctx.lineTo(roofW * 0.5, bodyY);
    ctx.closePath();
    ctx.fill();

    // 车身描边
    ctx.lineWidth = Math.max(1.5, 1.8 * s);
    ctx.strokeStyle = isLight
      ? 'rgba(15,23,42,0.8)'
      : 'rgba(248,250,252,0.9)';
    ctx.beginPath();
    ctx.moveTo(-carW * 0.5, bodyY + carH * 0.6);
    ctx.lineTo(-carW * 0.5, bodyY);
    ctx.lineTo(-roofW * 0.35, roofY);
    ctx.lineTo(roofW * 0.35, roofY);
    ctx.lineTo(carW * 0.5, bodyY);
    ctx.lineTo(carW * 0.5, bodyY + carH * 0.6);
    ctx.stroke();

    // 车窗
    ctx.fillStyle = isLight
      ? 'rgba(191,219,254,0.7)'
      : 'rgba(30,58,138,0.5)';
    const winW = roofW * 0.5;
    const winH = roofH * 0.65;
    const winY = roofY + roofH * 0.2;
    ctx.beginPath();
    ctx.moveTo(-winW * 0.5, winY + winH);
    ctx.lineTo(-winW * 0.35, winY);
    ctx.lineTo(winW * 0.35, winY);
    ctx.lineTo(winW * 0.5, winY + winH);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.strokeStyle = isLight
      ? 'rgba(15,23,42,0.5)'
      : 'rgba(148,163,184,0.5)';
    ctx.stroke();

    // 车轮
    ctx.fillStyle = isLight ? '#1f2937' : '#e5e7eb';
    for (const wx of [-wheelOffsetX, wheelOffsetX]) {
      ctx.beginPath();
      ctx.arc(wx, bodyY + carH * 0.6 + wheelR * 0.1, wheelR, 0, Math.PI * 2);
      ctx.fill();
      // 轮毂
      ctx.fillStyle = isLight ? '#4b5563' : '#9ca3af';
      ctx.beginPath();
      ctx.arc(wx, bodyY + carH * 0.6 + wheelR * 0.1, wheelR * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isLight ? '#1f2937' : '#e5e7eb';
    }

    // 车灯（车头方向在右侧，因为 facingRight 时未翻转）
    const lightColor = facingRight
      ? 'rgba(250,204,21,0.9)'
      : 'rgba(239,68,68,0.9)';
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(carW * 0.48, bodyY + carH * 0.25, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // 标签（在车上方）
    ctx.restore();
    ctx.fillStyle = isLight ? '#111827' : '#f9fafb';
    ctx.font = `bold ${Math.max(16, Math.round(14 * visualScale))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, mid - 32 * visualScale);
  };

  drawCar(screenXA, 'rgba(96,165,250,1)', 'A', current.vA);
  drawCar(screenXB, 'rgba(248,113,113,1)', 'B', current.vB);

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
