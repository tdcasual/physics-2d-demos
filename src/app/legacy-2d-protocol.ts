export type LegacyReadoutItem = {
  label: string;
  value: string;
};

export type LegacyReadoutMessage = {
  type: 'legacy:readout';
  items: LegacyReadoutItem[];
};

export type LegacyStatusMessage = {
  type: 'legacy:status';
  text: string;
};

export type LegacyControlExtMessage = {
  type: 'legacy:control-ext';
  sceneId: string;
  command: string;
  payload?: unknown;
};

export function isTrustedLegacyOrigin(origin: string, expectedOrigin: string): boolean {
  return origin === expectedOrigin;
}

function isReadoutItems(value: unknown): value is LegacyReadoutItem[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const row = item as Record<string, unknown>;
    return typeof row.label === 'string' && typeof row.value === 'string';
  });
}

export function isLegacyReadoutMessage(value: unknown): value is LegacyReadoutMessage {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return payload.type === 'legacy:readout' && isReadoutItems(payload.items);
}

export function isLegacyStatusMessage(value: unknown): value is LegacyStatusMessage {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return payload.type === 'legacy:status' && typeof payload.text === 'string';
}

export function isLegacyControlExtMessage(value: unknown): value is LegacyControlExtMessage {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.type === 'legacy:control-ext' &&
    typeof payload.sceneId === 'string' &&
    typeof payload.command === 'string'
  );
}

export function resolveLegacyTargetOrigin(sourcePath: string, currentOrigin: string): string {
  try {
    return new URL(sourcePath, currentOrigin).origin;
  } catch {
    return currentOrigin;
  }
}

export function buildLegacyIframeSourcePath(
  sourcePath: string,
  queryParams: Record<string, string> = {}
): string {
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  try {
    const url = new URL(sourcePath, baseOrigin);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const fallback = new URLSearchParams(queryParams).toString();
    const prefix = sourcePath.includes('?') ? '&' : '?';
    return encodeURI(fallback.length > 0 ? `${sourcePath}${prefix}${fallback}` : sourcePath);
  }
}
