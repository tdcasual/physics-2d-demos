import { describe, expect, it } from 'vitest';
import { toNavFileName } from '../../src/app/navigation-display';

describe('toNavFileName', () => {
  it('keeps only html file name from absolute path', () => {
    expect(toNavFileName('/animations/electromagnetism/3D电荷等势面.html')).toBe('3D电荷等势面.html');
  });

  it('strips query/hash from html route', () => {
    expect(toNavFileName('/src/pages/legacy-2d.html?scene=legacy-field-lines#demo')).toBe('legacy-2d.html');
  });

  it('falls back safely for empty path', () => {
    expect(toNavFileName('')).toBe('index.html');
  });
});
