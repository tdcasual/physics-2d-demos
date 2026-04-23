/**
 * 弹簧绘制
 */

export function drawSpring(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils: number,
  coilWidth: number,
  color: string
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return;

  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  const coilLen = len * 0.85;
  const startOffset = len * 0.075;
  const pointsPerCoil = 4;
  const totalPoints = coils * pointsPerCoil;

  ctx.moveTo(0, 0);
  ctx.lineTo(startOffset, 0);

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / totalPoints;
    const x = startOffset + t * coilLen;
    const waveIndex = i % pointsPerCoil;
    let y = 0;
    if (waveIndex === 1) y = -coilWidth;
    else if (waveIndex === 3) y = coilWidth;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.restore();
}
