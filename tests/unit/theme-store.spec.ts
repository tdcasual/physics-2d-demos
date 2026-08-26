import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  storeTheme,
  resolveSystemTheme,
  resolveThemePreference
} from '../../src/app/theme-store';

const LEGACY_KEY = 'physics-demos-container-state';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getStoredTheme', () => {
    it('returns null when nothing is stored', () => {
      expect(getStoredTheme()).toBeNull();
    });

    it('reads schema v1 JSON from the unified key', () => {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ v: 1, theme: 'dark' })
      );
      expect(getStoredTheme()).toBe('dark');
    });

    it('reads all valid theme values', () => {
      for (const theme of ['light', 'dark', 'system'] as const) {
        localStorage.setItem(
          THEME_STORAGE_KEY,
          JSON.stringify({ v: 1, theme })
        );
        expect(getStoredTheme()).toBe(theme);
      }
    });

    it('migrates legacy bare-string values', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getStoredTheme()).toBe('dark');
    });

    it('ignores corrupted JSON', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'not-json{');
      expect(getStoredTheme()).toBeNull();
    });

    it('ignores wrong schema version', () => {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ v: 0, theme: 'dark' })
      );
      expect(getStoredTheme()).toBeNull();
    });

    it('ignores invalid theme values', () => {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ v: 1, theme: 'blue' })
      );
      expect(getStoredTheme()).toBeNull();
    });

    it('migrates theme from legacy container state key', () => {
      localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify({
          v: 1,
          theme: 'dark',
          preferredLayout: 'split-right',
          timestamp: 123
        })
      );
      expect(getStoredTheme()).toBe('dark');
    });

    it('prefers the unified key over the legacy container state', () => {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ v: 1, theme: 'light' })
      );
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ v: 1, theme: 'dark' }));
      expect(getStoredTheme()).toBe('light');
    });

    it('ignores corrupted legacy container state', () => {
      localStorage.setItem(LEGACY_KEY, 'garbage');
      expect(getStoredTheme()).toBeNull();
    });

    it('returns null when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe('storeTheme', () => {
    it('writes schema v1 JSON to the unified key', () => {
      storeTheme('dark');
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual({ v: 1, theme: 'dark' });
    });

    it('round-trips through getStoredTheme', () => {
      storeTheme('system');
      expect(getStoredTheme()).toBe('system');
    });

    it('does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(() => storeTheme('dark')).not.toThrow();
    });
  });

  describe('resolveSystemTheme', () => {
    it('returns light when system prefers light', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      expect(resolveSystemTheme()).toBe('light');
    });

    it('returns dark when system prefers dark', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      expect(resolveSystemTheme()).toBe('dark');
    });

    it('returns light when matchMedia is unavailable', () => {
      vi.stubGlobal('matchMedia', undefined);
      expect(resolveSystemTheme()).toBe('light');
    });
  });

  describe('resolveThemePreference', () => {
    it('passes through explicit light/dark', () => {
      expect(resolveThemePreference('light')).toBe('light');
      expect(resolveThemePreference('dark')).toBe('dark');
    });

    it('resolves system via system preference', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      expect(resolveThemePreference('system')).toBe('dark');
    });
  });
});
