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

  const { ctx, responsiveScale } = context;
  const points = trail.map((p) => worldToScreen(p, coords));
  const trailWidth = Math.max(1.5, 3 * responsiveScale);

  drawTrail(ctx, points, Colors.coral, trailWidth);
}
