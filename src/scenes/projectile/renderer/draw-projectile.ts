import type { DrawContext, WorldPoint } from './types';
import type { CoordSystem } from './types';
import { worldToScreen } from './coords';
import { drawBall } from '../../../core/unified-canvas';
import { Colors } from '../../../core/colors';

export function drawProjectile(
  context: DrawContext,
  position: WorldPoint,
  coords: CoordSystem
): void {
  const { ctx, responsiveScale } = context;
  const pos = worldToScreen(position, coords);
  const ballRadius = Math.max(3, 8 * responsiveScale);

  drawBall(ctx, pos.x, pos.y, ballRadius * Math.max(0.8, responsiveScale), Colors.coral);
}
