import { describe, expect, it } from 'vitest';
import type { ControlField } from '../../src/platform/controls-schema';
import { interferenceVernierCaliperControlsSchema } from '../../src/instruments/interference-vernier-caliper/controls-schema';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';

const schema = interferenceVernierCaliperControlsSchema;

function allFields(s: typeof schema): ControlField[] {
  return s.sections.flatMap((section) => section.fields);
}

describe('interference-vernier-caliper controls-schema', () => {
  it('has three sections with non-empty titles and fields', () => {
    expect(schema.sections).toHaveLength(3);
    for (const section of schema.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.fields.length).toBeGreaterThan(0);
      expect(section.span).toBe('full');
    }
    expect(schema.sections[0].collapsed).toBe(false);
    expect(schema.sections[1].collapsed).toBe(true);
  });

  it('uses unique field keys matching sim param names', () => {
    const fields = allFields(schema);
    const keys = fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);

    const simKeys = Object.keys(interferenceVernierCaliperMeta.defaultParams);
    for (const key of keys) {
      if (key === 'hint') continue; // hint 操作说明字段
      expect(simKeys).toContain(key);
    }
  });

  it('slider fields have valid bounds and aligned default values', () => {
    const sliders = allFields(schema).filter((f) => f.type === 'slider');
    expect(sliders.length).toBe(6);
    for (const slider of sliders) {
      if (slider.type !== 'slider') continue;
      expect(slider.min).toBeLessThan(slider.max);
      expect(slider.step).toBeGreaterThan(0);
      expect(slider.value).toBeGreaterThanOrEqual(slider.min);
      expect(slider.value).toBeLessThanOrEqual(slider.max);
      // 默认值必须落在步进网格上
      const steps = (slider.value - slider.min) / slider.step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    }
  });

  it('initialReading slider matches meta defaults and 0.002cm precision', () => {
    const reading = allFields(schema).find((f) => f.key === 'initialReading');
    expect(reading).toMatchObject({
      type: 'slider',
      min: 0,
      max: 2.1,
      step: 0.002,
      value: 1.4,
      unit: 'cm'
    });
    expect(interferenceVernierCaliperMeta.defaultParams.initialReading).toBe(
      1.4
    );
    expect(interferenceVernierCaliperMeta.precision).toBe(0.002);
  });

  it('zeroOffset slider covers ±0.1cm at 0.001cm step', () => {
    const zero = allFields(schema).find((f) => f.key === 'zeroOffset');
    expect(zero).toMatchObject({
      type: 'slider',
      min: -0.1,
      max: 0.1,
      step: 0.001,
      value: 0,
      unit: 'cm'
    });
  });

  it('fringe sliders match meta defaultParams', () => {
    const defaults = interferenceVernierCaliperMeta.defaultParams;
    for (const key of [
      'fringeSpacing',
      'fringeBlur',
      'fringeOpacity',
      'fringeEnvelopeWidth'
    ] as const) {
      const field = allFields(schema).find((f) => f.key === key);
      expect(field).toMatchObject({ type: 'slider', value: defaults[key] });
    }
  });

  it('hint field lists instruction lines', () => {
    const hint = allFields(schema).find((f) => f.key === 'hint');
    expect(hint?.type).toBe('hint');
    if (hint?.type !== 'hint') return;

    expect(hint.lines.join('\n')).toContain('微调旋钮减速比 10:1');
    expect(hint.lines.join('\n')).toContain('零位修正');
  });
});
