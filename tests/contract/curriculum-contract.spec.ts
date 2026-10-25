import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';
import {
  CURRICULUM_CHAPTER_INFO,
  CURRICULUM_DOMAIN_INFO,
  CURRICULUM_DOMAINS
} from '../../src/platform/curriculum';

describe('curriculum classification contract', () => {
  it('classifies every auto-discovered scene (meta-declared, ids unique)', () => {
    const ids = sceneRegistry.map((scene) => scene.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses valid domain/chapter pairs with complete labels', () => {
    for (const scene of sceneRegistry) {
      const domain = CURRICULUM_DOMAIN_INFO[scene.curriculumDomain];
      const chapter = CURRICULUM_CHAPTER_INFO[scene.curriculumChapter];

      expect(CURRICULUM_DOMAINS).toContain(scene.curriculumDomain);
      expect(domain.label, scene.id).toBeTruthy();
      expect(domain.color, scene.id).toMatch(/^var\(--category-/);
      expect(chapter.label, scene.id).toBeTruthy();
      expect(chapter.domain, scene.id).toBe(scene.curriculumDomain);
      expect(scene.category, scene.id).toBe(scene.curriculumDomain);
      expect(scene.categoryLabel, scene.id).toBe(domain.label);
    }
  });

  it('keeps every top-level domain represented in the catalog', () => {
    const present = new Set(
      sceneRegistry.map((scene) => scene.curriculumDomain)
    );
    for (const domain of CURRICULUM_DOMAINS) {
      expect(present, domain).toContain(domain);
    }
  });
});
