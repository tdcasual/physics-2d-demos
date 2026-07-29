import { describe, expect, it } from 'vitest';
import { instrumentManifest } from '../../src/instruments/_manifest/manifest';

describe('instrument-manifest', () => {
  it('uses unique ids and matching module paths', () => {
    const ids = instrumentManifest.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(
      instrumentManifest.map((entry) => entry.modulePath)
    ).toEqual(
      instrumentManifest.map(
        (entry) => `/src/instruments/${entry.id}/index.ts`
      )
    );
  });

  it('uses only contract-approved categories', () => {
    const approved = [
      'measurement',
      'timing',
      'optical',
      'electrical',
      'mechanical'
    ];
    for (const entry of instrumentManifest) {
      expect(approved).toContain(entry.category);
    }
  });
});
