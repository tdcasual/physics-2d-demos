import { describe, expect, it } from 'vitest';
import { instrumentManifest } from '../../src/instruments/_manifest/manifest';
import { spiralMicrometerMeta } from '../../src/instruments/spiral-micrometer/instrument.meta';
import { vernierCaliperMeta } from '../../src/instruments/vernier-caliper/instrument.meta';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';

describe('instrument manifest contract', () => {
  it('keeps manifest metadata and defaults aligned with instrument.meta', () => {
    const metas = [
      spiralMicrometerMeta,
      vernierCaliperMeta,
      micrometerEyepieceMeta,
      interferenceVernierCaliperMeta
    ];

    expect(instrumentManifest).toHaveLength(metas.length);
    for (const meta of metas) {
      const manifestEntry = instrumentManifest.find(
        (entry) => entry.id === meta.id
      );
      expect(
        manifestEntry,
        `${meta.id} must be present in manifest`
      ).toBeDefined();
      expect(manifestEntry).toMatchObject({
        title: meta.title,
        category: meta.category,
        description: meta.description,
        unit: meta.unit,
        precision: meta.precision,
        defaultParams: meta.defaultParams
      });
    }
  });
});
