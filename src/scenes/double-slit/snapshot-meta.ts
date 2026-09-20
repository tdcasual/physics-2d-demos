import type { MeasurementSnapshot } from '../../platform/data-workspace';

export function doubleSlitFringeOrder(
  snapshot: MeasurementSnapshot | null | undefined
): number | undefined {
  const value = snapshot?.metadata?.fringeOrder;
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function withDoubleSlitFringeOrder(
  snapshot: MeasurementSnapshot,
  fringeOrder: number
): MeasurementSnapshot {
  return {
    ...snapshot,
    metadata: { ...snapshot.metadata, fringeOrder }
  };
}
