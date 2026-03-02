import { describe, expect, it } from 'vitest';
import { toSceneIndex } from '../../scripts/generate-scene-index';

describe('toSceneIndex', () => {
  it('sorts scene metadata by title and keeps required fields', () => {
    const result = toSceneIndex([
      { id: 'b', title: 'B', path: '/b.html' },
      { id: 'a', title: 'A', path: '/a.html' }
    ]);

    expect(result.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
