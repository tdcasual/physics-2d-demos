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

  it('exposes textbook concept metadata for botanical navigation placards', () => {
    for (const item of sceneRegistry) {
      expect(item.subject.length, item.id).toBeGreaterThan(0);
      expect(item.concept.length, item.id).toBeGreaterThan(0);
      expect(item.subConcepts, item.id).toHaveLength(2);
      expect(item.subConcepts.every((entry) => entry.trim().length > 0), item.id).toBe(true);
    }
  });
});
