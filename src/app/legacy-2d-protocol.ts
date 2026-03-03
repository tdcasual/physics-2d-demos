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

export function resolveLegacyTargetOrigin(sourcePath: string, currentOrigin: string): string {
  try {
    return new URL(sourcePath, currentOrigin).origin;
  } catch {
    return currentOrigin;
  }
}
