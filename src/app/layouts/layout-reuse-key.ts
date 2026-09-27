import type { LayoutConfig } from './types';

/** Runtime-only fields: may change without rebuilding a pooled layout. */
const RUNTIME_KEYS = new Set([
  'theme',
  'preservedCanvas',
  'title',
  'layoutOverrides',
  'mobileBreakpoint',
  'tabletBreakpoint'
]);

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isDomNode(value: object): boolean {
  return typeof Node !== 'undefined' && value instanceof Node;
}

/**
 * Normalize stable primitives, enums, IDs, arrays, and plain records.
 * Drops functions, DOM nodes, and other non-plain objects/callback refs.
 */
export function normalizeStructuralValue(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (
    t === 'function' ||
    t === 'symbol' ||
    t === 'bigint' ||
    t === 'undefined'
  ) {
    return undefined;
  }
  if (t !== 'object') return undefined;
  const obj = value as object;
  if (isDomNode(obj)) return undefined;
  if (Array.isArray(obj)) {
    return obj
      .map((item) => normalizeStructuralValue(item))
      .filter((item) => item !== undefined);
  }
  if (!isPlainRecord(obj)) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    if (RUNTIME_KEYS.has(key)) continue;
    const nested = normalizeStructuralValue(obj[key]);
    if (nested !== undefined) out[key] = nested;
  }
  return out;
}

function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number' || t === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (t === 'object' && value) {
    const rec = value as Record<string, unknown>;
    return `{${Object.keys(rec)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(rec[key])}`)
      .join(',')}}`;
  }
  return 'null';
}

/**
 * Structural reuse key for a layout id + config.
 * Recursively includes nested capability declaration config and other
 * plain structural records. Never includes DOM nodes or functions.
 */
export function layoutReuseKey(
  layoutId: string,
  config?: LayoutConfig | Record<string, unknown>
): string {
  const normalized = normalizeStructuralValue(config ?? {});
  return `id=${layoutId}|${stableStringify(normalized)}`;
}
