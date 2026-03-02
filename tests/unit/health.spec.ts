import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../../src/app/health';

describe('getHealthStatus', () => {
  it('returns ok for bootstrap smoke check', () => {
    expect(getHealthStatus()).toBe('ok');
  });
});
