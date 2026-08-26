import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSceneParams, writeSceneParams } from '../../src/app/url-sync';
import type { SceneMeta } from '../../src/platform/scene-contract';

describe('url-sync', () => {
  const mockMeta: SceneMeta = {
    id: 'test',
    title: 'Test',
    path: '/test.html',
    keywords: [],
    objective: 'test',
    defaultParams: {
      speed: 20,
      angle: 45,
      count: 10
    },
    subject: '力学',
    concept: '测试',
    subConcepts: ['a', 'b']
  };

  beforeEach(() => {
    // Clean URL before each test
    window.history.replaceState({}, '', '/test.html');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  describe('readSceneParams', () => {
    it('reads numeric params and converts to correct types', () => {
      window.history.replaceState(
        {},
        '',
        '/test.html?speed=30&angle=60&count=5'
      );
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(30);
      expect(params.angle).toBe(60);
      expect(params.count).toBe(5);
    });

    it('preserves float params', () => {
      window.history.replaceState({}, '', '/test.html?speed=25.5&angle=45.7');
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(25.5);
      expect(params.angle).toBe(45.7);
    });

    it('ignores unknown params', () => {
      window.history.replaceState({}, '', '/test.html?speed=30&unknown=foo');
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(30);
      expect(params.unknown).toBeUndefined();
    });

    it('supports preset param', () => {
      window.history.replaceState({}, '', '/test.html?preset=moon');
      const params = readSceneParams(mockMeta);
      expect(params.preset).toBe('moon');
    });

    it('returns empty object when no matching params', () => {
      window.history.replaceState({}, '', '/test.html?foo=bar');
      const params = readSceneParams(mockMeta);
      expect(Object.keys(params)).toHaveLength(0);
    });
  });

  describe('writeSceneParams', () => {
    it('writes params to URL', () => {
      writeSceneParams({ speed: 30, angle: 60 });
      // Wait for debounce
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.get('speed')).toBe('30');
          expect(url.searchParams.get('angle')).toBe('60');
          resolve();
        }, 200);
      });
    });

    it('deletes params when value is undefined', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      writeSceneParams({ speed: undefined });
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.has('speed')).toBe(false);
          resolve();
        }, 200);
      });
    });

    it('preserves existing unrelated params', () => {
      window.history.replaceState({}, '', '/test.html?existing=foo');
      writeSceneParams({ speed: 30 });
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.get('existing')).toBe('foo');
          expect(url.searchParams.get('speed')).toBe('30');
          resolve();
        }, 200);
      });
    });
  });
});
