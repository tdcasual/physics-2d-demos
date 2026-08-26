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

    expect(entries.map((entry) => entry.id).sort()).toEqual([
      'interference-vernier-caliper',
      'micrometer-eyepiece',
      'spiral-micrometer',
      'vernier-caliper'
    ]);

    const spiral = entries.find((entry) => entry.id === 'spiral-micrometer')!;
    const factory = await spiral.loadFactory();
    expect(factory.meta.id).toBe('spiral-micrometer');
    expect(factory.createSim).toBeTypeOf('function');
    expect(factory.createView).toBeTypeOf('function');
  });

  it('sorts entries by semantic category order and localized title', () => {
    const entries = buildInstrumentRegistry();

    // 分类顺序确定：measurement 全部在 optical 之前
    expect(entries.map((entry) => entry.category)).toEqual([
      'measurement',
      'measurement',
      'measurement',
      'optical'
    ]);
    const measurementTitles = entries
      .filter((entry) => entry.category === 'measurement')
      .map((entry) => entry.title)
      .sort();
    expect(measurementTitles).toEqual(
      ['游标卡尺', '螺旋测微器', '高精度干涉测微仪'].sort()
    );
    expect(entries.find((entry) => entry.category === 'optical')?.title).toBe(
      '干涉读数游标卡尺'
    );
  });

  it('groups entries by category and exposes localized labels', () => {
    const grouped = buildRegistryByCategory();

    expect(Object.keys(grouped).sort()).toEqual(['measurement', 'optical']);
    expect(grouped.measurement?.map((entry) => entry.id).sort()).toEqual([
      'micrometer-eyepiece',
      'spiral-micrometer',
      'vernier-caliper'
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
    expect(
      getManifest()
        .map((entry) => entry.modulePath)
        .sort()
    ).toEqual([
      '/src/instruments/interference-vernier-caliper/index.ts',
      '/src/instruments/micrometer-eyepiece/index.ts',
      '/src/instruments/spiral-micrometer/index.ts',
      '/src/instruments/vernier-caliper/index.ts'
    ]);
    expect(validateManifest()).toEqual({ ok: true, errors: [] });
  });
});
