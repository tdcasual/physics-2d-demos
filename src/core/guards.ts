export type ClampConfig = {
  min: number;
  max: number;
  fallback: number;
};

export function clampParam(value: number, config: ClampConfig): number {
  if (!Number.isFinite(value)) {
    return config.fallback;
  }
  if (value < config.min) return config.min;
  if (value > config.max) return config.max;
  return value;
}
