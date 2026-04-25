import type { CircuitColors } from './circuit-colors';

const ELECTRON_COUNT = 24;
const electronPositions: number[] = Array.from(
  { length: ELECTRON_COUNT },
  (_, i) => i / ELECTRON_COUNT
);

/** 沿折线绘制流动的电子 */
export function drawElectronsOnPath(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  speed: number,
  phase: number,
  responsiveScale: number,
  colors: CircuitColors
): void {
  if (points.length < 2) return;

  // 计算路径总长度和各段长度
  const segments: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y
    );
    segments.push(len);
    totalLen += len;
  }
  if (totalLen < 1) return;

  const r = Math.max(2, 3 * responsiveScale);

  for (let i = 0; i < ELECTRON_COUNT; i++) {
    let t = (electronPositions[i] + phase * speed * 0.3) % 1;
    if (t < 0) t += 1;

    const dist = t * totalLen;
    let accumulated = 0;
    let segIndex = 0;
    for (let s = 0; s < segments.length; s++) {
      if (accumulated + segments[s] >= dist) {
        segIndex = s;
        break;
      }
      accumulated += segments[s];
    }

    const segT = segments[segIndex] > 0
      ? (dist - accumulated) / segments[segIndex]
      : 0;
    const p0 = points[segIndex];
    const p1 = points[segIndex + 1];
    const ex = p0.x + (p1.x - p0.x) * segT;
    const ey = p0.y + (p1.y - p0.y) * segT;

    // 电子亮度：在开关闭合且电流>0时显示，否则暗淡
    const brightness = speed > 0.05 ? 1 : 0.25;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fillStyle = speed > 0.05
      ? colors.electron
      : colors.electronDim;
    ctx.globalAlpha = brightness;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
