import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';
import {
  CURRICULUM_CHAPTER_INFO,
  CURRICULUM_DOMAIN_INFO,
  CURRICULUM_DOMAINS,
  SCENE_CURRICULUM
} from '../../src/platform/curriculum';

describe('curriculum classification contract', () => {
  it('covers every auto-discovered scene exactly once', () => {
    const catalogIds = sceneRegistry.map((scene) => scene.id).sort();
    const classificationIds = Object.keys(SCENE_CURRICULUM).sort();

    expect(catalogIds).toHaveLength(120);
    expect(classificationIds).toEqual(catalogIds);
  });

  it('uses valid domain/chapter pairs with complete labels', () => {
    for (const scene of sceneRegistry) {
      const manifest = SCENE_CURRICULUM[scene.id];
      const domain = CURRICULUM_DOMAIN_INFO[scene.curriculumDomain];
      const chapter = CURRICULUM_CHAPTER_INFO[scene.curriculumChapter];

      expect(manifest, scene.id).toEqual({
        domain: scene.curriculumDomain,
        chapter: scene.curriculumChapter
      });
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
