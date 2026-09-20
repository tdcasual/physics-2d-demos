import type {
  EstimatedRangeReading,
  ExactDiscreteReading
} from '../../platform/data-workspace';

export const DOUBLE_SLIT_TRIAL_COUNT = 1;
export const DOUBLE_SLIT_MAX_ROWS = 6;

/** 游标 0.002 cm → 0.02 mm，与 interferenceVernierCaliperMeta.precision 一致 */
export const CALIPER_PRECISION_MM = 0.02;
/** 测微仪 0.01 mm，与 micrometerEyepieceMeta.precision 一致 */
export const MICROMETER_PRECISION_MM = 0.01;
export const MICROMETER_MAX_MM = 32;

export const CALIPER_READING_STRATEGY: ExactDiscreteReading = {
  kind: 'exact-discrete',
  stepMm: CALIPER_PRECISION_MM
};

export const MICROMETER_READING_STRATEGY: EstimatedRangeReading = {
  kind: 'estimated-range',
  halfRangeMm: 0.005,
  minMm: 0,
  maxMm: MICROMETER_MAX_MM
};
