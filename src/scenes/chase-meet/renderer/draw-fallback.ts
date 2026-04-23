import type { ChaseMeetSnapshot } from '../scene.sim';

export function drawFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: ChaseMeetSnapshot,
  theme: 'light' | 'dark'
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme === 'light' ? '#ffffff' : '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = theme === 'light' ? '#111827' : '#e5e7eb';
  ctx.font = '16px system-ui';
  ctx.fillText(`t=${snapshot.state.t.toFixed(2)}s`, 16, 28);
  ctx.fillText(`distance=${snapshot.state.distance.toFixed(2)}m`, 16, 52);
}
