import { describe, expect, it } from 'vitest';
import type { ControlField } from '../../src/platform/controls-schema';
import { micrometerEyepieceControlsSchema } from '../../src/instruments/micrometer-eyepiece/controls-schema';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';

const schema = micrometerEyepieceControlsSchema;

function allFields(s: typeof schema): ControlField[] {
  return s.sections.flatMap((section) => section.fields);
}

describe('micrometer-eyepiece controls-schema', () => {
  it('has four sections with non-empty titles and fields', () => {
    expect(schema.sections).toHaveLength(4);
    for (const section of schema.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.fields.length).toBeGreaterThan(0);
      expect(section.span).toBe('full');
    }
    expect(schema.sections.map((s) => s.title)).toEqual([
      '读数参数',
      '视场模式',
      '干涉条纹',
      '操作说明'
    ]);
  });

  it('uses unique field keys matching sim param names', () => {
    const fields = allFields(schema);
    const keys = fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);

    const simKeys = Object.keys(micrometerEyepieceMeta.defaultParams);
    for (const key of keys) {
      if (key === 'hint') continue; // custom 操作说明字段
      expect(simKeys).toContain(key);
    }
  });

  it('slider fields have valid bounds and aligned default values', () => {
    const sliders = allFields(schema).filter((f) => f.type === 'slider');
    expect(sliders.length).toBe(5);
    for (const slider of sliders) {
      if (slider.type !== 'slider') continue;
      expect(slider.min).toBeLessThan(slider.max);
      expect(slider.step).toBeGreaterThan(0);
      expect(slider.value).toBeGreaterThanOrEqual(slider.min);
      expect(slider.value).toBeLessThanOrEqual(slider.max);
      const steps = (slider.value - slider.min) / slider.step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    }
  });

  it('initialReading slider matches meta default and 0.01mm precision', () => {
    const reading = allFields(schema).find((f) => f.key === 'initialReading');
    expect(reading).toMatchObject({
      type: 'slider',
      min: 0,
      max: 32,
      step: 0.01,
      value: 0,
      unit: 'mm'
    });
    expect(reading).toMatchObject({
      value: micrometerEyepieceMeta.defaultParams.initialReading
    });
    expect(micrometerEyepieceMeta.precision).toBe(0.01);
  });

  it('viewMode select offers crosshair and fringe with a valid default', () => {
    const viewMode = allFields(schema).find((f) => f.key === 'viewMode');
    expect(viewMode?.type).toBe('select');
    if (viewMode?.type !== 'select') return;

    expect(viewMode.options.map((o) => o.value)).toEqual([
      'crosshair',
      'fringe'
    ]);
    expect(viewMode.options.map((o) => o.value)).toContain(viewMode.value);
  });

  it('stripeColor is a text field with an rgba default', () => {
    const color = allFields(schema).find((f) => f.key === 'stripeColor');
    expect(color?.type).toBe('text');
    if (color?.type !== 'text') return;
    expect(color.value).toMatch(/^rgba\(/);
  });

  it('stripe sliders stay within the deserialize clamp ranges of the view', () => {
    // instrument.view.ts deserialize 钳制区间：spacing [20,100]、angle [0,180]、offset [0,maxReading=32]
    const spacing = allFields(schema).find((f) => f.key === 'stripeSpacing');
    expect(spacing).toMatchObject({ min: 20, max: 100 });
    const angle = allFields(schema).find((f) => f.key === 'stripeAngle');
    expect(angle).toMatchObject({ min: 0, max: 180 });
    const offset = allFields(schema).find((f) => f.key === 'stripeOffset');
    expect(offset).toMatchObject({ min: 0, max: 32 });
  });

  it('stripeOffset slider uses mm matching meta defaultParams', () => {
    // renderer 消费链：viewOffset = (reading - offset) * crosshairSpeed(px/mm)
    // → stripeOffset 量纲为 mm，与 double-slit 场景的同名参数一致
    const offset = allFields(schema).find((f) => f.key === 'stripeOffset');
    expect(offset).toMatchObject({
      type: 'slider',
      step: 0.01,
      value: 12,
      unit: 'mm'
    });
    expect(offset).toMatchObject({
      value: micrometerEyepieceMeta.defaultParams.stripeOffset
    });
  });

  it('custom hint field renders one paragraph per instruction line', () => {
    const hint = allFields(schema).find((f) => f.key === 'hint');
    expect(hint?.type).toBe('custom');
    if (hint?.type !== 'custom') return;

    const mount = document.createElement('div');
    hint.render(mount);
    const paragraphs = mount.querySelectorAll('p');
    expect(paragraphs).toHaveLength(4);
    expect(mount.textContent).toContain('零位修正');
  });
});
