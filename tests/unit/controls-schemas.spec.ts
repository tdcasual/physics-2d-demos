import { describe, it, expect } from 'vitest';
import type { ControlsSchema } from '../../src/platform/controls-schema';

const schemaModules = import.meta.glob<Record<string, unknown>>(
  [
    '../../src/scenes/*/controls-schema.ts',
    '../../src/instruments/*/controls-schema.ts'
  ],
  { eager: true }
);

const schemas = Object.entries(schemaModules)
  .map(([path, module]) => {
    const schema = Object.values(module).find(
      (value): value is ControlsSchema =>
        typeof value === 'object' &&
        value !== null &&
        'sections' in value &&
        Array.isArray((value as { sections?: unknown }).sections)
    );
    return { id: path.split('/').slice(-2, -1)[0], schema };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

describe('Controls schemas', () => {
  it('discovers every declarative controls schema', () => {
    expect(schemas).toHaveLength(Object.keys(schemaModules).length);
    for (const entry of schemas) {
      expect(
        entry.schema,
        `${entry.id} has no exported ControlsSchema`
      ).toBeDefined();
    }
  });

  for (const { id, schema } of schemas) {
    describe(`${id} controls schema`, () => {
      it('should have at least one section', () => {
        expect(schema!.sections.length).toBeGreaterThan(0);
      });

      it('should have valid section titles', () => {
        for (const section of schema!.sections) {
          expect(typeof section.title).toBe('string');
          expect(section.title.length).toBeGreaterThan(0);
        }
      });

      it('should have valid fields with unique keys', () => {
        const keys = new Set<string>();
        for (const section of schema!.sections) {
          expect(section.fields.length).toBeGreaterThan(0);
          for (const field of section.fields) {
            expect(typeof field.key).toBe('string');
            expect(field.key.length).toBeGreaterThan(0);
            expect(keys.has(field.key)).toBe(false);
            keys.add(field.key);
          }
        }
      });

      it('should have valid field types', () => {
        const validTypes = [
          'slider',
          'number',
          'text',
          'select',
          'button',
          'toggle',
          'preset-group',
          'transport',
          'scene-selector',
          'button-grid',
          'hint',
          'custom'
        ];
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            expect(validTypes).toContain(field.type);
          }
        }
      });

      it('should have slider fields with valid numeric bounds', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'slider') {
              expect(typeof field.min).toBe('number');
              expect(typeof field.max).toBe('number');
              expect(typeof field.step).toBe('number');
              expect(typeof field.value).toBe('number');
              expect(field.max).toBeGreaterThan(field.min);
              expect(field.step).toBeGreaterThan(0);
              expect(field.value).toBeGreaterThanOrEqual(field.min);
              expect(field.value).toBeLessThanOrEqual(field.max);
            }
          }
        }
      });

      it('should have number fields with valid bounds if present', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'number') {
              expect(typeof field.value).toBe('number');
              if (
                typeof field.min === 'number' &&
                typeof field.max === 'number'
              ) {
                expect(field.max).toBeGreaterThan(field.min);
                expect(field.value).toBeGreaterThanOrEqual(field.min);
                expect(field.value).toBeLessThanOrEqual(field.max);
              }
            }
          }
        }
      });

      it('should have toggle fields with boolean values', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'toggle') {
              expect(typeof field.value).toBe('boolean');
            }
          }
        }
      });

      it('should have preset-group with valid columns and presets', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'preset-group') {
              expect(field.presets.length).toBeGreaterThan(0);
              if (field.columns !== undefined) {
                expect([2, 3, 4]).toContain(field.columns);
              }
              if (field.initialActive !== undefined) {
                const ids = field.presets.map((p) => p.id);
                expect(ids).toContain(field.initialActive);
              }
              for (const preset of field.presets) {
                expect(typeof preset.id).toBe('string');
                expect(typeof preset.label).toBe('string');
              }
            }
          }
        }
      });

      it('should have button-grid with valid columns and buttons', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'button-grid') {
              expect(field.buttons.length).toBeGreaterThan(0);
              if (field.columns !== undefined) {
                expect([1, 2, 3]).toContain(field.columns);
              }
              const keys = new Set<string>();
              for (const btn of field.buttons) {
                expect(typeof btn.key).toBe('string');
                expect(typeof btn.label).toBe('string');
                expect(keys.has(btn.key)).toBe(false);
                keys.add(btn.key);
              }
            }
          }
        }
      });

      it('should have scene-selector with valid scenes if present', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'scene-selector') {
              expect(field.scenes.length).toBeGreaterThan(0);
              if (field.initialActive !== undefined) {
                const ids = field.scenes.map((s) => s.id);
                expect(ids).toContain(field.initialActive);
              }
            }
          }
        }
      });

      it('should have hint fields with non-empty string lines', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'hint') {
              expect(field.lines.length).toBeGreaterThan(0);
              for (const line of field.lines) {
                expect(typeof line).toBe('string');
                expect(line.length).toBeGreaterThan(0);
              }
            }
          }
        }
      });

      it('should have text fields with string value', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'text') {
              expect(typeof field.value).toBe('string');
            }
          }
        }
      });

      it('should have select fields with options', () => {
        for (const section of schema!.sections) {
          for (const field of section.fields) {
            if (field.type === 'select') {
              expect(field.options.length).toBeGreaterThan(0);
              const values = new Set<string>();
              for (const opt of field.options) {
                expect(typeof opt.label).toBe('string');
                expect(typeof opt.value).toBe('string');
                expect(values.has(opt.value)).toBe(false);
                values.add(opt.value);
              }
            }
          }
        }
      });
    });
  }
});
