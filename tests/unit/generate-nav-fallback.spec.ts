import { describe, expect, it } from 'vitest';
import { toFallbackScript } from '../../scripts/generate-nav-fallback';

describe('toFallbackScript', () => {
  it('serializes pages into window global', () => {
    const script = toFallbackScript([{ id: 'a', title: 'A', path: '/a' }]);
    expect(script).toContain('window.__SCENE_FALLBACK__');
    expect(script).toContain('"id":"a"');
  });
});
