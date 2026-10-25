import type { ReadoutItem } from '../layouts/types';
import type { ResolvedDemoProfile } from '../../platform/demo-profile';
import { normalizeReadoutItem } from '../../platform/readout';

const READOUT_DENYLIST = ['显示模式', '主题', 'T / Δt', 'T/Δt'];

/**
 * Normalize readouts (platform formatting: precision, unit, negative zero)
 * and keep presentation-mode readouts focused on the values selected by the
 * scene's demo profile. Normal mode preserves the complete readout list.
 */
export function filterPresentationReadout(
  rawItems: ReadoutItem[],
  mode: 'normal' | 'presentation',
  resolved: ResolvedDemoProfile | null
): ReadoutItem[] {
  const items = rawItems.map(normalizeReadoutItem);
  if (mode !== 'presentation' || !resolved) return items;
  if (resolved.readoutKeys.length > 0) {
    return items.filter(
      (item) => item.key != null && resolved.readoutKeys.includes(item.key)
    );
  }
  return items.filter(
    (item) => !READOUT_DENYLIST.some((deny) => item.label.includes(deny))
  );
}
