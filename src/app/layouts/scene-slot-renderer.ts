import type { ILayout, LayoutSlots, Scene } from './types';

const SLOT_RENDER_MAP = [
  {
    slot: 'header' as const,
    method: 'renderHeader' as const,
    clear: true,
    passSlots: false
  },
  {
    slot: 'control' as const,
    method: 'renderControl' as const,
    clear: true,
    passSlots: false
  },
  {
    slot: 'animation' as const,
    method: 'renderAnimation' as const,
    clear: false,
    passSlots: true
  },
  {
    slot: 'graph' as const,
    method: 'renderGraph' as const,
    clear: true,
    passSlots: false
  },
  {
    slot: 'readout' as const,
    method: 'renderReadout' as const,
    clear: true,
    passSlots: false
  }
];

export function renderSceneToSlots(scene: Scene, layout: ILayout): void {
  const slots = layout.getSlots?.() || {};

  for (const entry of SLOT_RENDER_MAP) {
    const slotEl = slots[entry.slot];
    if (!slotEl) continue;

    if (entry.clear) {
      slotEl.innerHTML = '';
    }

    const method = scene[entry.method];
    if (typeof method !== 'function') continue;

    if (entry.passSlots) {
      (method as (el: HTMLElement, s: LayoutSlots) => void).call(
        scene,
        slotEl,
        slots as LayoutSlots
      );
    } else {
      (method as (el: HTMLElement) => void).call(scene, slotEl);
    }
  }
}
