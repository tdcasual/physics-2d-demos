import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';

describe('sceneRegistry', () => {
  it('has unique ids and includes all modern scenes', () => {
    const ids = sceneRegistry.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('projectile');
    expect(ids).toContain('chase-meet');
    expect(ids).toContain('field-lines');
    expect(ids).toContain('emf-analogy');
    expect(ids).toContain('electrification');
    expect(ids).toContain('vt-integral');
  });
});
