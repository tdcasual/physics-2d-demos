import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';

describe('modern scene catalog', () => {
  it('contains only modern entries routed to modern pages', () => {
    expect(sceneRegistry.length).toBeGreaterThanOrEqual(6);
    for (const item of sceneRegistry) {
      expect(item.source).toBe('modern');
      expect(item.path.startsWith('/src/pages/')).toBe(true);
      expect(item.path.includes('legacy-2d')).toBe(false);
    }
  });
});
