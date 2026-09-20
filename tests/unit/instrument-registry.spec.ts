import { describe, expect, it } from 'vitest';
import {
  buildInstrumentRegistry,
  buildRegistryByCategory,
  getCategoryLabel,
  getManifest,
  validateManifest
} from '../../src/instruments/instrument-registry';
import type { InstrumentMeta } from '../../src/instruments/_contract/instrument-contract';

const discoveredMetaModules = import.meta.glob(
  '/src/instruments/*/instrument.meta.ts',
  { eager: true }
) as Record<string, Record<string, unknown>>;

const discoveredMetas = Object.values(discoveredMetaModules).map((module) => {
  const meta = Object.values(module).find(
    (value): value is InstrumentMeta<Record<string, unknown>> =>
      typeof value === 'object' && value !== null && 'id' in value
  );
  if (!meta) throw new Error('instrument.meta.ts must export InstrumentMeta');
  return meta;
});

describe('instrument-registry', () => {
  it('builds manifest-backed entries with lazy factories', async () => {
    const entries = buildInstrumentRegistry();

    expect(entries.map((entry) => entry.id).sort()).toEqual(
      discoveredMetas.map((meta) => meta.id).sort()
    );

    for (const entry of entries) {
      const factory = await entry.loadFactory();
      expect(factory.meta.id).toBe(entry.id);
      expect(factory.createSim).toBeTypeOf('function');
      expect(factory.createView).toBeTypeOf('function');
    }
  });

  it('sorts entries by semantic category order and localized title', () => {
    const entries = buildInstrumentRegistry();
    const categoryOrder = [
      'measurement',
      'timing',
      'optical',
      'electrical',
      'mechanical'
    ];
    const expected = [...entries].sort((a, b) => {
      const categoryDifference =
        categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      return categoryDifference || a.title.localeCompare(b.title, 'zh-CN');
    });
    expect(entries).toEqual(expected);
  });

  it('groups entries by category and exposes localized labels', () => {
    const grouped = buildRegistryByCategory();

    expect(Object.keys(grouped).sort()).toEqual(
      [...new Set(discoveredMetas.map((meta) => meta.category))].sort()
    );
    expect(
      Object.values(grouped)
        .flat()
        .map((entry) => entry.id)
        .sort()
    ).toEqual(discoveredMetas.map((meta) => meta.id).sort());

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
    ).toEqual(
      discoveredMetas
        .map((meta) => `/src/instruments/${meta.id}/index.ts`)
        .sort()
    );
    expect(validateManifest()).toEqual({ ok: true, errors: [] });
  });
});
