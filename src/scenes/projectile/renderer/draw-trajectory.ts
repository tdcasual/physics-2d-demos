import type { DrawContext, WorldPoint } from './types';
import type { CoordSystem } from './types';
import { worldToScreen } from './coords';
import { drawTrail } from '../../../core/draw-primitives';
import { Colors } from '../../../core/colors';

export function drawTrajectory(
  context: DrawContext,
  trail: WorldPoint[],
  coords: CoordSystem
): void {
  if (trail.length < 2) return;

  const { ctx, responsiveScale, contentScale, theme } = context;
  const isDark = theme === 'dark';
  const points = trail.map((p) => worldToScreen(p, coords));
  const trailWidth = Math.max(1.5, 3 * responsiveScale * contentScale);

  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(255,107,107,0.5)' : 'rgba(239,83,80,0.35)';
  ctx.shadowBlur = 6 * responsiveScale * contentScale;
  drawTrail(ctx, points, Colors.coral, trailWidth);
  ctx.restore();
}
