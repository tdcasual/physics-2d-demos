/**
 * Fit an instrument's painted parts into its parent.
 *
 * Layout boxes (695×250, 700×450, …) omit overhangs such as the caliper
 * knob / micrometer thimble, so callers must pass a live union of real parts.
 */

// ancestorZoomScale 已迁至 core/canvas-sizing.ts（与 stageZoomOf /
// localPointerDelta 同处一套测量 API），此处 re-export 保持既有调用方不变。
export { ancestorZoomScale } from '../../core/canvas-sizing';

export type VisualBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type BoxConverter = (box: VisualBox) => VisualBox;

const IDENTITY_CONVERT: BoxConverter = (box) => box;

type FitSpace = {
  convert: BoxConverter;
  /** The transformed ancestor; clip ancestors above it must be ignored. */
  boundary: HTMLElement | null;
};

const LOCAL_FIT_SPACE: FitSpace = { convert: IDENTITY_CONVERT, boundary: null };

/**
 * Fit measurements come from getBoundingClientRect (screen space), but the
 * resulting fit transform is applied in the root's local coordinate space.
 * A transformed ancestor (stage panzoom viewport) mixes the two spaces and
 * makes every refit drift; and the slot's overflow clip above the viewport
 * is merely the zoom window — fitting into it would cancel the zoom.
 * Detect the nearest transformed ancestor, convert screen boxes back into
 * its local space, and stop clip intersection at it, so a refit under zoom
 * is idempotent and the zoom stays a pure view transform.
 */
function localFitSpace(el: HTMLElement): FitSpace {
  let node = el.parentElement;
  while (node) {
    const t = getComputedStyle(node).transform;
    if (t && t !== 'none') {
      const r = node.getBoundingClientRect();
      const w = node.offsetWidth;
      const k = w > 0 ? r.width / w : 1;
      if (!Number.isFinite(k) || k <= 0 || Math.abs(k - 1) <= 1e-6) {
        return LOCAL_FIT_SPACE;
      }
      const mx = r.left;
      const my = r.top;
      return {
        boundary: node,
        convert: (box) => ({
          left: (box.left - mx) / k,
          right: (box.right - mx) / k,
          top: (box.top - my) / k,
          bottom: (box.bottom - my) / k
        })
      };
    }
    node = node.parentElement;
  }
  return LOCAL_FIT_SPACE;
}

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
export function visibleClipRect(
  el: HTMLElement,
  convert: BoxConverter = IDENTITY_CONVERT,
  stopAt?: HTMLElement | null
): VisualBox {
  const self = convert(el.getBoundingClientRect());
  let left = self.left;
  let right = self.right;
  let top = self.top;
  let bottom = self.bottom;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const r = convert(node.getBoundingClientRect());
    if (style.overflowX !== 'visible') {
      left = Math.max(left, r.left);
      right = Math.min(right, r.right);
    }
    if (style.overflowY !== 'visible') {
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    if (node === stopAt) break;
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
  const space = localFitSpace(parent);
  const convert = space.convert;
  const clip = visibleClipRect(parent, convert, space.boundary);
  const rootRect = options?.root?.getBoundingClientRect();
  const origin =
    rootRect != null
      ? convert({
          left: rootRect.left,
          right: rootRect.right,
          top: rootRect.top,
          bottom: rootRect.bottom
        })
      : { left: clip.left, top: clip.top };
  const local = convert(union);
  const availW = Math.max(clip.right - clip.left - pad * 2, 1);
  const availH = Math.max(clip.bottom - clip.top - pad * 2, 1);
  const unionW = Math.max(local.right - local.left, 1);
  const unionH = Math.max(local.bottom - local.top, 1);
  const scale = Math.min(availW / unionW, availH / unionH, maxScale);
  const targetLeft = clip.left + pad + (availW - unionW * scale) / 2;
  const targetTop = clip.top + pad + (availH - unionH * scale) / 2;
  const tx = targetLeft - origin.left - (local.left - origin.left) * scale;
  const ty = targetTop - origin.top - (local.top - origin.top) * scale;
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
  const space = localFitSpace(parent);
  const convert = space.convert;
  const clip = visibleClipRect(parent, convert, space.boundary);
  const rootRect = options?.root?.getBoundingClientRect();
  const origin =
    rootRect != null
      ? convert({
          left: rootRect.left,
          right: rootRect.right,
          top: rootRect.top,
          bottom: rootRect.bottom
        })
      : { left: clip.left, top: clip.top };
  const fullBox = convert(full);
  const funcBox = convert(functional);
  const availW = Math.max(clip.right - clip.left - pad * 2, 1);
  const availH = Math.max(clip.bottom - clip.top - pad * 2, 1);
  const fullW = Math.max(fullBox.right - fullBox.left, 1);
  const fullH = Math.max(fullBox.bottom - fullBox.top, 1);
  const funcW = Math.max(funcBox.right - funcBox.left, 1);
  const funcH = Math.max(funcBox.bottom - funcBox.top, 1);
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
  const tx = targetLeft - origin.left - (funcBox.left - origin.left) * scale;
  const ty = targetTop - origin.top - (funcBox.top - origin.top) * scale;
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
