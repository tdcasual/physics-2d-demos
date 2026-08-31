import { describe, expect, it } from 'vitest';
import {
  gansheParamMapping,
  ganshePresets
} from '../../src/scenes/ganshe/presets';
import { gansheControlsSchema } from '../../src/scenes/ganshe/controls-schema';
import {
  createWaveInterferenceSim,
  DOMAIN_MAX,
  type WaveParams
} from '../../src/scenes/ganshe/scene.sim';

// 与 scene.sim.ts 中 normalizeParams 的 clamp 域保持一致
const PARAM_DOMAINS = {
  freq1: { min: 0.5, max: 20 },
  freq2: { min: 0.5, max: 20 },
  amp1: { min: 0.5, max: 15 },
  amp2: { min: 0.5, max: 15 },
  phaseDiff: { min: 0, max: 360 },
  observerX: { min: 0, max: DOMAIN_MAX }
} as const;

const EXPECTED_PRESET_IDS = [
  'constructive',
  'destructive',
  'beat',
  'standing',
  'pulse'
];

describe('ganshe presets', () => {
  describe('preset completeness', () => {
    it('declares exactly the expected preset ids (unique, no extras)', () => {
      const ids = Object.keys(ganshePresets);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.sort()).toEqual([...EXPECTED_PRESET_IDS].sort());
    });

    it('every preset id is wired into the controls-schema preset-group', () => {
      const presetFields = gansheControlsSchema.sections
        .flatMap((section) => section.fields)
        .filter((field) => field.type === 'preset-group');
      const schemaIds = presetFields.flatMap((field) =>
        field.type === 'preset-group' ? field.presets.map((p) => p.id) : []
      );
      for (const id of Object.keys(ganshePresets)) {
        expect(schemaIds).toContain(id);
      }
    });

    it('every preset key is a valid WaveParams key', () => {
      const validKeys = new Set(
        Object.keys(createWaveInterferenceSim().getParams())
      );
      for (const [id, preset] of Object.entries(ganshePresets)) {
        for (const key of Object.keys(preset)) {
          expect(
            validKeys.has(key),
            `${id}.${key} 不是合法 WaveParams 键`
          ).toBe(true);
        }
      }
    });
  });

  describe('preset value domains', () => {
    it.each(Object.entries(ganshePresets))(
      '%s: numeric values stay inside the sim clamp domains',
      (_id, preset) => {
        for (const [key, domain] of Object.entries(PARAM_DOMAINS)) {
          const value = preset[key as keyof typeof PARAM_DOMAINS];
          if (typeof value === 'number') {
            expect(
              value,
              `${key}=${value} 应落在 [${domain.min}, ${domain.max}]`
            ).toBeGreaterThanOrEqual(domain.min);
            expect(value).toBeLessThanOrEqual(domain.max);
          }
        }
      }
    );

    it.each(Object.entries(ganshePresets))(
      '%s: mode and isPulseMode are well-typed when present',
      (_id, preset) => {
        if (preset.mode !== undefined) {
          expect(['head-on', 'single']).toContain(preset.mode);
        }
        if (preset.isPulseMode !== undefined) {
          expect(typeof preset.isPulseMode).toBe('boolean');
        }
      }
    );
  });

  describe('preset application round-trip', () => {
    it.each(Object.entries(ganshePresets))(
      '%s: survives normalizeParams unchanged (no clamping surprises)',
      (_id, preset) => {
        const sim = createWaveInterferenceSim(preset);
        const params = sim.getParams();
        for (const [key, value] of Object.entries(preset)) {
          expect(
            params[key as keyof WaveParams],
            `键 ${key} 应用后发生变化`
          ).toEqual(value);
        }
      }
    );

    it('constructive preset is fully constructive (Δφ=0, 同频)', () => {
      expect(ganshePresets.constructive.phaseDiff).toBe(0);
      expect(ganshePresets.constructive.freq1).toBe(
        ganshePresets.constructive.freq2
      );
    });

    it('destructive preset is fully destructive (Δφ=180°, 同频)', () => {
      expect(ganshePresets.destructive.phaseDiff).toBe(180);
      expect(ganshePresets.destructive.freq1).toBe(
        ganshePresets.destructive.freq2
      );
    });

    it('beat preset uses unequal frequencies', () => {
      expect(ganshePresets.beat.freq1).not.toBe(ganshePresets.beat.freq2);
    });

    it('standing / pulse presets use head-on mode', () => {
      expect(ganshePresets.standing.mode).toBe('head-on');
      expect(ganshePresets.pulse.mode).toBe('head-on');
    });

    it('only the pulse preset enables pulse mode', () => {
      for (const [id, preset] of Object.entries(ganshePresets)) {
        expect(preset.isPulseMode).toBe(id === 'pulse');
      }
    });
  });

  describe('gansheParamMapping', () => {
    it('is an identity mapping onto valid WaveParams keys', () => {
      const validKeys = new Set(
        Object.keys(createWaveInterferenceSim().getParams())
      );
      for (const [schemaKey, paramKey] of Object.entries(gansheParamMapping)) {
        expect(paramKey).toBe(schemaKey);
        expect(validKeys.has(paramKey)).toBe(true);
      }
    });
  });
});
