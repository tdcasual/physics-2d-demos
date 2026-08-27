import type { DrawContext, WorldPoint } from './types';
import type { CoordSystem } from './types';
import { worldToScreen } from './coords';
import { drawArrow, drawBall } from '../../../core/draw-primitives';
import { Colors } from '../../../core/colors';

export function drawProjectile(
  context: DrawContext,
  position: WorldPoint,
  velocity: { vx: number; vy: number },
  coords: CoordSystem,
  landed: boolean
): void {
  const { ctx, responsiveScale, contentScale, theme } = context;
  const isDark = theme === 'dark';
  const s = responsiveScale * contentScale;
  const pos = worldToScreen(position, coords);
  const ballRadius = Math.max(3, 8 * s);

  // Dashed guide lines from ball to axes
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(71,85,105,0.15)';
  ctx.lineWidth = Math.max(0.5, 1 * s);
  ctx.setLineDash([3 * s, 3 * s]);

  // Vertical line to x-axis
  if (position.y > 0.5) {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, coords.originY);
    ctx.stroke();
  }

  // Horizontal line to y-axis
  if (position.x > 0.5) {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(coords.originX, pos.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Ball (画在速度矢量之下，使分解箭头保持可见)
  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(255,107,107,0.5)' : 'rgba(239,83,80,0.4)';
  ctx.shadowBlur = 6 * s;
  drawBall(ctx, pos.x, pos.y, ballRadius * Math.max(0.8, s), Colors.coral);
  ctx.restore();

  // Velocity vector
  const speed = Math.hypot(velocity.vx, velocity.vy);
  if (speed > 0.1 && !landed) {
    const vScale = Math.max(1.5, 2.5 * s);
    const arrowLen = Math.min(speed * vScale * coords.scale * 0.015, 80 * s);

    // vx component (horizontal, blue)
    const vxLen = Math.abs(velocity.vx) * vScale * coords.scale * 0.015;
    if (vxLen > 2) {
      drawArrow(
        ctx,
        pos.x,
        pos.y,
        pos.x + Math.sign(velocity.vx) * Math.min(vxLen, 60 * s),
        pos.y,
        {
          color: isDark ? 'rgba(96,165,250,0.7)' : 'rgba(59,130,246,0.6)',
          lineWidth: Math.max(1, 1.5 * s),
          headSize: Math.max(3, 5 * s)
        }
      );
    }

    // vy component (vertical, green)
    const vyLen = Math.abs(velocity.vy) * vScale * coords.scale * 0.015;
    if (vyLen > 2) {
      drawArrow(
        ctx,
        pos.x,
        pos.y,
        pos.x,
        pos.y - Math.sign(velocity.vy) * Math.min(vyLen, 60 * s),
        {
          color: isDark ? 'rgba(74,222,128,0.7)' : 'rgba(22,163,74,0.6)',
          lineWidth: Math.max(1, 1.5 * s),
          headSize: Math.max(3, 5 * s)
        }
      );
    }

    // Total velocity vector (white/bright)
    const vAngle = Math.atan2(-velocity.vy, velocity.vx);
    const vEndX = pos.x + Math.cos(vAngle) * Math.min(arrowLen, 80 * s);
    const vEndY = pos.y + Math.sin(vAngle) * Math.min(arrowLen, 80 * s);
    drawArrow(ctx, pos.x, pos.y, vEndX, vEndY, {
      color: isDark ? 'rgba(248,250,252,0.85)' : 'rgba(15,23,42,0.75)',
      lineWidth: Math.max(1.5, 2 * s),
      headSize: Math.max(4, 6 * s)
    });
  }

  // Acceleration vector (gravity, always pointing down)
  if (!landed) {
    const gLen = 25 * s;
    drawArrow(ctx, pos.x, pos.y, pos.x, pos.y + gLen, {
      color: isDark ? 'rgba(251,191,36,0.7)' : 'rgba(202,138,4,0.6)',
      lineWidth: Math.max(1.5, 2 * s),
      headSize: Math.max(4, 6 * s)
    });

    // "g" label
    ctx.fillStyle = isDark ? 'rgba(251,191,36,0.8)' : 'rgba(202,138,4,0.7)';
    ctx.font = `600 ${Math.max(9, Math.round(10 * s))}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('g', pos.x + 5 * s, pos.y + gLen * 0.5);
  }

  // Landing marker
  if (landed) {
    const landScreen = worldToScreen({ x: position.x, y: 0 }, coords);
    const markerR = Math.max(4, 6 * s);

    // Cross marker
    ctx.strokeStyle = isDark ? 'rgba(239,68,68,0.7)' : 'rgba(220,50,50,0.6)';
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(landScreen.x - markerR, landScreen.y - markerR);
    ctx.lineTo(landScreen.x + markerR, landScreen.y + markerR);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(landScreen.x + markerR, landScreen.y - markerR);
    ctx.lineTo(landScreen.x - markerR, landScreen.y + markerR);
    ctx.stroke();

    // Distance label
    ctx.fillStyle = isDark ? 'rgba(226,232,240,0.8)' : 'rgba(30,41,59,0.75)';
    ctx.font = `600 ${Math.max(10, Math.round(11 * s))}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${position.x.toFixed(1)}m`,
      landScreen.x,
      landScreen.y + 8 * s
    );
  }
}
