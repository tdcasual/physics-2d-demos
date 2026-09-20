/**
 * Micrometer eyepiece alignment — same viewOffset as render-view.ts.
 */

import {
  repeatingOffsetAlignment,
  type FringeAlignment
} from '../../_utils/fringe-alignment';

export function micrometerViewOffsetPx(options: {
  readingMm: number;
  initialReading: number;
  stripeOffsetMm: number;
  crosshairSpeed: number;
}): number {
  return (
    (options.readingMm - options.initialReading - options.stripeOffsetMm) *
    options.crosshairSpeed
  );
}

export function micrometerFringeAlignment(options: {
  readingMm: number;
  initialReading: number;
  stripeOffsetMm: number;
  crosshairSpeed: number;
  stripeSpacingPx: number;
}): FringeAlignment {
  const offsetPx = micrometerViewOffsetPx(options);
  return repeatingOffsetAlignment(offsetPx, options.stripeSpacingPx);
}
