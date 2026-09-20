/**
 * Fit an instrument's painted parts into its parent.
 *
 * Layout boxes (695×250, 700×450, …) omit overhangs such as the caliper
 * knob / micrometer thimble, so callers must pass a live union of real parts.
 */

export type VisualBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function unionClientRects(
  root: ParentNode,
  selectors: readonly string[]
): VisualBox | null {
  const rects: DOMRect[] = [];
  for (const sel of selectors) {
    root.querySelectorAll(sel).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const r = node.getBoundingClientRect();
      if (r.width > 1 && r.height > 1) rects.push(r);
    });
  }
  if (rects.length === 0) return null;
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom))
  };
}

/** Parent box intersected with overflow-clip ancestors (stage/wrap). */
export function visibleClipRect(el: HTMLElement): VisualBox {
  const self = el.getBoundingClientRect();
  let left = self.left;
  let right = self.right;
  let top = self.top;
  let bottom = self.bottom;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    if (style.overflowX !== 'visible') {
      left = Math.max(left, r.left);
      right = Math.min(right, r.right);
    }
    if (style.overflowY !== 'visible') {
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    node = node.parentElement;
  }
  return { left, right, top, bottom };
}

export function fitTransformToParent(
  parent: HTMLElement,
  union: VisualBox,
  options?: { pad?: number; maxScale?: number; root?: HTMLElement }
): { scale: number; tx: number; ty: number } {
  const pad = options?.pad ?? 8;
  const maxScale = options?.maxScale ?? 1.25;
  const clip = visibleClipRect(parent);
  const origin = options?.root?.getBoundingClientRect() ?? {
    left: clip.left,
    top: clip.top
  };
  const availW = Math.max(clip.right - clip.left - pad * 2, 1);
  const availH = Math.max(clip.bottom - clip.top - pad * 2, 1);
  const unionW = Math.max(union.right - union.left, 1);
  const unionH = Math.max(union.bottom - union.top, 1);
  const scale = Math.min(availW / unionW, availH / unionH, maxScale);
  const targetLeft = clip.left + pad + (availW - unionW * scale) / 2;
  const targetTop = clip.top + pad + (availH - unionH * scale) / 2;
  const tx = targetLeft - origin.left - (union.left - origin.left) * scale;
  const ty = targetTop - origin.top - (union.top - origin.top) * scale;
  return { scale, tx, ty };
}

/**
 * Narrow hosts: contain the full painted union when the functional
 * region (eyepiece + reading scale) stays legible. Otherwise scale and
 * left-align that functional union and let the remainder overflow-x.
 */
export function fitFunctionalUnionToParent(
  parent: HTMLElement,
  full: VisualBox,
  functional: VisualBox,
  options?: {
    pad?: number;
    maxScale?: number;
    minFunctionalPx?: number;
    root?: HTMLElement;
  }
): { scale: number; tx: number; ty: number } {
  const pad = options?.pad ?? 8;
  const maxScale = options?.maxScale ?? 1.25;
  const minFunctionalPx = options?.minFunctionalPx ?? 140;
  const clip = visibleClipRect(parent);
  const origin = options?.root?.getBoundingClientRect() ?? {
    left: clip.left,
    top: clip.top
  };
  const availW = Math.max(clip.right - clip.left - pad * 2, 1);
  const availH = Math.max(clip.bottom - clip.top - pad * 2, 1);
  const fullW = Math.max(full.right - full.left, 1);
  const fullH = Math.max(full.bottom - full.top, 1);
  const funcW = Math.max(functional.right - functional.left, 1);
  const funcH = Math.max(functional.bottom - functional.top, 1);
  const containFull = Math.min(availW / fullW, availH / fullH, maxScale);
  const functionalScale = Math.min(availW / funcW, availH / funcH, maxScale);
  // Only contain the unused far sleeve when that does not shrink the
  // eyepiece/reading junction relative to a functional-only fit.
  if (
    containFull >= functionalScale * 0.9 &&
    funcW * containFull >= minFunctionalPx &&
    funcH * containFull >= minFunctionalPx
  ) {
    return fitTransformToParent(parent, full, {
      pad,
      maxScale,
      root: options?.root
    });
  }
  const scale = functionalScale;
  const targetLeft = clip.left + pad;
  const targetTop = clip.top + pad;
  const tx = targetLeft - origin.left - (functional.left - origin.left) * scale;
  const ty = targetTop - origin.top - (functional.top - origin.top) * scale;
  return { scale, tx, ty };
}

/**
 * Width-based narrow scale. Independent of host height so a collapsed
 * `--dw-h` cannot shrink the instrument to a 20px sliver.
 */
export function narrowInstrumentScale(
  fitWidth: number,
  layoutWidth: number,
  options?: { pad?: number; minScale?: number; maxScale?: number }
): number {
  const pad = options?.pad ?? 8;
  const minScale = options?.minScale ?? 0.3;
  const maxScale = options?.maxScale ?? 1;
  const width = Math.max(layoutWidth, 1);
  return Math.min(
    maxScale,
    Math.max(minScale, (Math.max(fitWidth, 1) - pad) / width)
  );
}

export function applyFitTransform(
  root: HTMLElement,
  fit: { scale: number; tx: number; ty: number }
): void {
  root.style.transformOrigin = 'top left';
  root.style.transform = `translate(${fit.tx}px, ${fit.ty}px) scale(${fit.scale})`;
}
