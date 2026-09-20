/**
 * Repeating-fringe alignment against a crosshair / view offset.
 *
 * Offset 0, ±spacing, ±2spacing… is a bright-fringe centre (matches the
 * micrometer onAlign contract). residualPx is the distance to the nearest
 * centre in the same pixel space as spacingPx.
 */

export type FringeAlignment = {
  aligned: boolean;
  fringeOrder: number;
  residualPx: number;
};

export const DEFAULT_ALIGN_TOLERANCE_PX = 2;

export function repeatingOffsetAlignment(
  offsetPx: number,
  spacingPx: number,
  tolerancePx: number = DEFAULT_ALIGN_TOLERANCE_PX
): FringeAlignment {
  const spacing = spacingPx > 0 ? spacingPx : 1;
  const wrapped = ((offsetPx % spacing) + spacing) % spacing;
  const residualPx = Math.min(wrapped, spacing - wrapped);
  const fringeOrder = Math.round(offsetPx / spacing);
  return {
    aligned: residualPx < tolerancePx,
    fringeOrder,
    residualPx
  };
}
