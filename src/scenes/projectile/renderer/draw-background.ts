import type { DrawContext } from './types';
import { getThemeColors } from '../../../core/colors';
import { drawGrid } from '../../../core/unified-canvas';

export function drawBackground(
  context: DrawContext,
  originX: number,
  originY: number
): void {
  const { ctx, width, height, theme } = context;
  const colors = getThemeColors(theme);

  ctx.fillStyle = colors.canvasBg;
  ctx.fillRect(0, 0, width, height);

  drawGrid(
    ctx,
    width,
    height,
    {
      originX,
      originY,
      showGrid: true,
      showAxes: false
    },
    theme === 'dark'
  );
}
