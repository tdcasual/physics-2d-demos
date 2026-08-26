/**
 * 统一主题存储 — 全站单一主题事实源
 *
 * 首页（React useTheme）与场景页（SceneContainer / scene-bootstrapper）
 * 共用本模块，避免主题状态分裂在多个 localStorage key。
 *
 * - 统一 key：`physics-lab-theme`，schema v1：`{ v: 1, theme }`
 * - 兼容读取旧裸字符串与旧容器状态 `physics-demos-container-state`
 *   中的 theme 字段（一次性迁移读取，不回写旧 key）
 * - localStorage 异常（隐私模式等）静默容错
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'physics-lab-theme';

/** 旧版场景容器状态 key，仅用于一次性迁移读取其中的 theme 字段 */
const LEGACY_CONTAINER_STORAGE_KEY = 'physics-demos-container-state';
const THEME_SCHEMA_VERSION = 1;

interface ThemeStorageSchema {
  v: number;
  theme: ThemePreference;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * 解析存储值为主题偏好。
 * 兼容两种格式：schema v1 JSON 与旧版裸字符串。
 * （旧容器状态 JSON 恰好也是 `{ v: 1, theme }` 结构，可直接复用本函数。）
 */
function parseStoredTheme(raw: string | null): ThemePreference | null {
  if (!raw) return null;
  // 兼容旧版：直接存储的裸字符串
  if (isThemePreference(raw)) return raw;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeStorageSchema> | null;
    if (
      parsed &&
      parsed.v === THEME_SCHEMA_VERSION &&
      isThemePreference(parsed.theme)
    ) {
      return parsed.theme;
    }
  } catch {
    // 数据损坏，忽略
  }
  return null;
}

/**
 * 读取存储的主题偏好。
 * 优先级：统一 key > 旧容器状态 theme 字段（一次性迁移读取）> null
 */
export function getStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
    if (stored) return stored;
    // 旧版容器状态中的 theme 字段（一次性迁移读取，不回写）
    return parseStoredTheme(localStorage.getItem(LEGACY_CONTAINER_STORAGE_KEY));
  } catch {
    // localStorage 不可用（隐私模式等），忽略
    return null;
  }
}

/**
 * 持久化主题偏好到统一 key（schema v1）。
 */
export function storeTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ThemeStorageSchema = {
      v: THEME_SCHEMA_VERSION,
      theme
    };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage 不可用，忽略
  }
}

/**
 * 解析系统主题偏好（matchMedia prefers-color-scheme）。
 */
export function resolveSystemTheme(): ResolvedThemePreference {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * 把主题偏好解析为实际明暗模式（'system' 时取系统偏好）。
 */
export function resolveThemePreference(
  theme: ThemePreference
): ResolvedThemePreference {
  return theme === 'system' ? resolveSystemTheme() : theme;
}
