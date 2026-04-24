/**
 * 主题管理 Hook
 * Theme Management Hook
 * 
 * 特性：
 * - 自动检测系统偏好
 * - 手动覆盖并持久化
 * - 平滑过渡动画
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = 'physics-lab-theme';
const THEME_SCHEMA_VERSION = 1;

interface ThemeStorageSchema {
  v: number;
  theme: Theme;
}

function migrateThemeStorage(raw: string | null): Theme | null {
  if (!raw) return null;
  // 兼容旧版：直接存储的原始字符串
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  try {
    const parsed = JSON.parse(raw) as ThemeStorageSchema;
    if (parsed.v === THEME_SCHEMA_VERSION && parsed.theme) {
      if (['light', 'dark', 'system'].includes(parsed.theme)) {
        return parsed.theme;
      }
    }
  } catch {
    // 数据损坏，忽略
  }
  return null;
}

export function useTheme(): UseThemeReturn {
  // 初始化主题
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    
    try {
      const stored = migrateThemeStorage(localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch {
      // 忽略 localStorage 错误
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // 解析主题为实际明暗模式
  const resolveTheme = useCallback((t: Theme): ResolvedTheme => {
    if (t === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    }
    return t;
  }, []);

  // 应用主题到文档
  const applyTheme = useCallback((t: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
  }, []);

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    
    try {
      const payload: ThemeStorageSchema = {
        v: THEME_SCHEMA_VERSION,
        theme: newTheme
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // 忽略 localStorage 错误
    }
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const current = resolvedTheme;
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = resolveTheme('system');
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    // 现代 API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 旧版 API 兼容
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme, resolveTheme, applyTheme]);

  // 主题变化时更新
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme, resolveTheme, applyTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}

export default useTheme;
