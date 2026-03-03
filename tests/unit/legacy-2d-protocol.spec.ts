import { describe, expect, it } from 'vitest';
import { isLegacyReadoutMessage, isTrustedLegacyOrigin } from '../../src/app/legacy-2d-protocol';

describe('legacy protocol', () => {
  it('accepts same-origin and rejects foreign origin', () => {
    expect(isTrustedLegacyOrigin('https://a.com', 'https://a.com')).toBe(true);
    expect(isTrustedLegacyOrigin('https://evil.com', 'https://a.com')).toBe(false);
  });

  it('validates readout payload shape', () => {
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x', value: '1' }] })).toBe(true);
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x' }] })).toBe(false);
  });
});
