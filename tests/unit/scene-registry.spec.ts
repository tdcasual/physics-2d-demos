import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';

describe('sceneRegistry', () => {
  it('has unique ids and includes both modern and legacy scenes', () => {
    const ids = sceneRegistry.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('projectile');
    expect(ids).toContain('legacy-field-lines');
  });
});
