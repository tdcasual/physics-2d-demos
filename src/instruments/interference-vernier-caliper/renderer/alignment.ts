/**
 * Caliper eyepiece alignment: pattern coordinate at the crosshair vs tile period.
 *
 * Bright peak sits at half a tile (see buildStripeTile). Convert that into the
 * same “offset from a centre is a multiple of spacing” space used by
 * repeatingOffsetAlignment.
 */

import {
  repeatingOffsetAlignment,
  type FringeAlignment
} from '../../_utils/fringe-alignment';
import {
  LEAST_COUNT_PX,
  LENS_OFFSET_FROM_VERNIER,
  LENS_VISUAL_SCALE,
  PATTERN_ABSOLUTE_X,
  UNIT_PX
} from './constants';

/** Matches `.lens-glass { width/height: 134px }` in styles.ts */
export const CALIPER_LENS_GLASS_PX = 134;
export const CALIPER_LENS_CENTER_PX = CALIPER_LENS_GLASS_PX / 2;

export function snapCaliperReadingPx(readingCm: number): number {
  let snappedX =
    Math.round((readingCm * UNIT_PX) / LEAST_COUNT_PX) * LEAST_COUNT_PX;
  if (snappedX < 0) snappedX = 0;
  return snappedX;
}

export function caliperVisualSpacingPx(fringeSpacingSimPx: number): number {
  return Math.round(fringeSpacingSimPx * LENS_VISUAL_SCALE);
}

export function caliperBackgroundOffsetPx(readingCm: number): number {
  const snappedX = snapCaliperReadingPx(readingCm);
  const patternTranslateX =
    PATTERN_ABSOLUTE_X - (snappedX + LENS_OFFSET_FROM_VERNIER);
  return Math.round(patternTranslateX * LENS_VISUAL_SCALE);
}

export function caliperCrosshairViewOffsetPx(options: {
  readingCm: number;
  visualSpacingPx: number;
  viewMode: 'fringe' | 'crosshair';
  crosshairRefCm: number;
  stripeOffsetMm: number;
}): number {
  const {
    readingCm,
    visualSpacingPx,
    viewMode,
    crosshairRefCm,
    stripeOffsetMm
  } = options;
  if (viewMode === 'crosshair') {
    const vo =
      (readingCm * 10 - crosshairRefCm * 10 - stripeOffsetMm) *
      ((UNIT_PX * LENS_VISUAL_SCALE) / 10);
    const patternCoord = CALIPER_LENS_CENTER_PX + vo;
    return patternCoord - visualSpacingPx / 2;
  }
  const rawOffset = caliperBackgroundOffsetPx(readingCm);
  const patternCoord = CALIPER_LENS_CENTER_PX - rawOffset;
  return patternCoord - visualSpacingPx / 2;
}

export function sampleCaliperAlignedReadingsCm(
  fringeSpacingSimPx: number,
  count: number = 6
): Array<{ readingCm: number; order: number }> {
  const found: Array<{ readingCm: number; order: number }> = [];
  const seen = new Set<number>();
  for (let cm = 0.2; cm <= 2.05 && found.length < count; cm += 0.002) {
    const alignment = caliperFringeAlignment({
      readingCm: cm,
      fringeSpacingSimPx
    });
    if (alignment.aligned && !seen.has(alignment.fringeOrder)) {
      seen.add(alignment.fringeOrder);
      found.push({ readingCm: cm, order: alignment.fringeOrder });
    }
  }
  return found;
}

export function caliperFringeAlignment(options: {
  readingCm: number;
  fringeSpacingSimPx: number;
  viewMode?: 'fringe' | 'crosshair';
  crosshairRefCm?: number;
  stripeOffsetMm?: number;
}): FringeAlignment {
  const visualSpacingPx = caliperVisualSpacingPx(options.fringeSpacingSimPx);
  const offsetPx = caliperCrosshairViewOffsetPx({
    readingCm: options.readingCm,
    visualSpacingPx,
    viewMode: options.viewMode ?? 'fringe',
    crosshairRefCm: options.crosshairRefCm ?? options.readingCm,
    stripeOffsetMm: options.stripeOffsetMm ?? 0
  });
  return repeatingOffsetAlignment(offsetPx, visualSpacingPx);
}
