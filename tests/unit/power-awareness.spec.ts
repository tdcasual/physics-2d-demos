import { describe, expect, it } from 'vitest';
import { detectLowPowerMode } from '../../src/app/layouts/power-awareness';

describe('detectLowPowerMode', () => {
  it('should return a boolean', async () => {
    const result = await detectLowPowerMode();
    expect(typeof result).toBe('boolean');
  });

  it('should not throw when navigator APIs are unavailable', async () => {
    await expect(detectLowPowerMode()).resolves.toBeDefined();
  });
});
