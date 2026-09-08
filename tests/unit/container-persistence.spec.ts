import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  persistState,
  restorePersistedState
} from '../../src/app/layouts/container-persistence';

// 容器状态只关心布局偏好是否已注册；主题由 theme-store 统一管理
vi.mock('../../src/app/layouts/registry', () => ({
  layoutRegistry: {
    has: vi.fn((id: string) => id === 'split-right' || id === 'mobile-stack')
  }
}));

describe('container-persistence', () => {
  const storageKey = 'test-container-state';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('persistState / restorePersistedState', () => {
    it('should persist and restore preferred layout', () => {
      persistState(storageKey, 'split-right');
      const restored = restorePersistedState(storageKey);
      expect(restored).not.toBeNull();
      expect(restored!.preferredLayout).toBe('split-right');
    });

    it('should not write a theme field (theme lives in theme-store)', () => {
      persistState(storageKey, 'mobile-stack');
      const raw = localStorage.getItem(storageKey);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect('theme' in parsed).toBe(false);
      expect(parsed.preferredLayout).toBe('mobile-stack');
    });

    it('should restore null when no data exists', () => {
      const restored = restorePersistedState(storageKey);
      expect(restored).toBeNull();
    });

    it('should ignore the theme field from legacy data', () => {
      // 旧版本容器状态含 theme 字段；恢复时忽略它（theme-store 负责迁移吸收）
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          v: 1,
          theme: 'dark',
          preferredLayout: 'split-right'
        })
      );
      const restored = restorePersistedState(storageKey);
      expect(restored).not.toBeNull();
      expect('theme' in restored!).toBe(false);
      expect(restored!.preferredLayout).toBe('split-right');
    });

    it('should ignore data with wrong version', () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ v: 0, preferredLayout: 'split-right' })
      );
      const restored = restorePersistedState(storageKey);
      expect(restored).toBeNull();
    });

    it('should ignore corrupted JSON', () => {
      localStorage.setItem(storageKey, 'not-json');
      const restored = restorePersistedState(storageKey);
      expect(restored).toBeNull();
    });

    it('should include timestamp in persisted data', () => {
      const before = Date.now();
      persistState(storageKey, null);
      const after = Date.now();

      const raw = localStorage.getItem(storageKey);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.v).toBe(1);
      expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
      expect(parsed.timestamp).toBeLessThanOrEqual(after);
    });

    it('should handle null preferredLayout', () => {
      persistState(storageKey, null);
      const restored = restorePersistedState(storageKey);
      expect(restored).not.toBeNull();
      expect(restored!.preferredLayout).toBeUndefined();
    });

    it('should ignore unregistered layout ids', () => {
      persistState(storageKey, 'nonexistent-layout');
      const restored = restorePersistedState(storageKey);
      expect(restored).not.toBeNull();
      expect(restored!.preferredLayout).toBeUndefined();
    });
  });
});
