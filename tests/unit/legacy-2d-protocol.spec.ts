import { describe, expect, it } from 'vitest';
import {
  buildLegacyIframeSourcePath,
  isLegacyControlExtMessage,
  isLegacyReadoutMessage,
  isTrustedLegacyOrigin
} from '../../src/app/legacy-2d-protocol';

describe('legacy protocol', () => {
  it('accepts same-origin and rejects foreign origin', () => {
    expect(isTrustedLegacyOrigin('https://a.com', 'https://a.com')).toBe(true);
    expect(isTrustedLegacyOrigin('https://evil.com', 'https://a.com')).toBe(false);
  });

  it('validates readout payload shape', () => {
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x', value: '1' }] })).toBe(true);
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x' }] })).toBe(false);
  });

  it('builds iframe source path with embed params', () => {
    expect(buildLegacyIframeSourcePath('/animations/electromagnetism/模拟电场线.html', { embed: '1' })).toBe(
      '/animations/electromagnetism/%E6%A8%A1%E6%8B%9F%E7%94%B5%E5%9C%BA%E7%BA%BF.html?embed=1'
    );
    expect(buildLegacyIframeSourcePath('/foo.html?scene=x', { embed: '1', theme: 'dark' })).toContain(
      '/foo.html?scene=x&embed=1&theme=dark'
    );
  });

  it('validates extended control payload shape', () => {
    expect(
      isLegacyControlExtMessage({
        type: 'legacy:control-ext',
        sceneId: 'legacy-field-lines',
        command: 'set-density',
        payload: { density: 30 }
      })
    ).toBe(true);
    expect(isLegacyControlExtMessage({ type: 'legacy:control-ext', command: 1 })).toBe(false);
  });
});
