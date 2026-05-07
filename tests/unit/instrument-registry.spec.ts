import { describe, expect, it } from 'vitest';
import {
  buildInstrumentRegistry,
  buildRegistryByCategory,
  getCategoryLabel,
  getManifest,
  validateManifest
} from '../../src/instruments/instrument-registry';

describe('instrument-registry', () => {
  it('builds manifest-backed entries with lazy factories', async () => {
    const entries = buildInstrumentRegistry();

    expect(entries.map((entry) => entry.id)).toEqual([
      'micrometer-eyepiece',
      'interference-vernier-caliper'
    ]);

    const factory = await entries[0].loadFactory();
    expect(factory.meta.id).toBe('micrometer-eyepiece');
    expect(factory.createSim).toBeTypeOf('function');
    expect(factory.createView).toBeTypeOf('function');
  });

  it('sorts entries by semantic category order and localized title', () => {
    const entries = buildInstrumentRegistry();

    expect(entries.map((entry) => entry.category)).toEqual([
      'measurement',
      'optical'
    ]);
    expect(entries[0]?.title).toBe('高精度干涉测微仪');
    expect(entries[1]?.title).toBe('干涉读数游标卡尺');
  });

  it('groups entries by category and exposes localized labels', () => {
    const grouped = buildRegistryByCategory();

    expect(Object.keys(grouped).sort()).toEqual(['measurement', 'optical']);
    expect(grouped.measurement?.map((entry) => entry.id)).toEqual([
      'micrometer-eyepiece'
    ]);
    expect(grouped.optical?.map((entry) => entry.id)).toEqual([
      'interference-vernier-caliper'
    ]);

    expect(getCategoryLabel('measurement')).toBe('测量仪器');
    expect(getCategoryLabel('optical')).toBe('光学仪器');
    expect(getCategoryLabel('electrical')).toBe('电子仪器');
    expect(getCategoryLabel('mechanical')).toBe('力学仪器');
    expect(getCategoryLabel('timing')).toBe('计时仪器');
    expect(getCategoryLabel('custom')).toBe('custom');
  });

  it('keeps manifest paths in sync with files on disk', () => {
    expect(getManifest().map((entry) => entry.modulePath)).toEqual([
      '/src/instruments/micrometer-eyepiece/index.ts',
      '/src/instruments/interference-vernier-caliper/index.ts'
    ]);
    expect(validateManifest()).toEqual({ ok: true, errors: [] });
  });
});
