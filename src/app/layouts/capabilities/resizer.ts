/**
 * Resizer Capability — 可拖拽分隔条
 *
 * 支持 vertical（左右）和 horizontal（上下）两个方向。
 * vertical 方向直接更新 container.style.gridTemplateColumns，
 * 确保拖拽结果不会在窗口 resize 时被 handleResize 覆盖。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../core/types';

export interface ResizerConfig {
  direction?: 'vertical' | 'horizontal';
  targetSelector?: string;
  minSize?: number;
  maxSize?: number;
  className?: string;
  selector?: string;
  onResize?(ratio: number): void;
}

export function createResizer(
  cfg: ResizerConfig = {}
): CapabilityDefinition<ResizerConfig> {
  return {
    id: 'resizer',

    mount(
      _slots: LayoutSlots,
      config: ResizerConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const merged = { ...cfg, ...config };
      const direction = merged.direction ?? 'vertical';
      const targetSel = merged.targetSelector ?? '.layout-left-panel';
      const minSize = merged.minSize ?? 260;
      const maxSize = merged.maxSize ?? 960;
      const className = merged.className ?? (
        direction === 'vertical' ? 'layout-resizer-v' : 'layout-resizer-h'
      );

      let resizer: HTMLElement | null = null;
      let created = false;

      if (merged.selector) {
        resizer = ctx.container.querySelector(merged.selector) as HTMLElement | null;
      }
      if (!resizer) {
        resizer = document.createElement('div');
        created = true;
      }

      resizer.className = `${resizer.className} ${className}`.trim();
      resizer.setAttribute('role', 'separator');
      resizer.setAttribute(
        'aria-orientation',
        direction === 'vertical' ? 'vertical' : 'horizontal'
      );
      resizer.setAttribute(
        'aria-label',
        direction === 'vertical' ? '调整左侧面板宽度' : '调整面板高度'
      );
      resizer.setAttribute('tabindex', '0');

      if (created) {
        ctx.container.appendChild(resizer);
      }

      const target = ctx.container.querySelector(targetSel) as HTMLElement | null;

      // Track active drag listeners for cleanup on dispose-during-drag
      let activeMove: ((ev: MouseEvent) => void) | null = null;
      let activeUp: (() => void) | null = null;

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        resizer!.classList.add('is-dragging');

        const startPos = direction === 'vertical' ? e.clientX : e.clientY;
        const startSize = direction === 'vertical'
          ? (target?.clientWidth ?? 300)
          : (target?.clientHeight ?? 200);

        const handleMouseMove = (ev: MouseEvent) => {
          const currentPos = direction === 'vertical' ? ev.clientX : ev.clientY;
          const delta = currentPos - startPos;
          // Horizontal: resizer sits between animation (above) and graph (below).
          // Dragging UP (negative delta) should increase graph height.
          const signedDelta = direction === 'horizontal' ? -delta : delta;
          const newSize = Math.max(minSize, Math.min(maxSize, startSize + signedDelta));
          const containerSize = direction === 'vertical'
            ? ctx.container.clientWidth
            : ctx.container.clientHeight;
          const ratio = newSize / (containerSize || 1);

          if (target) {
            if (direction === 'vertical') {
              // Replace first column track — handles plain px,
              // minmax(), calc(), and other CSS functions.
              const cols = ctx.container.style.gridTemplateColumns;
              const updated = cols.replace(/^[^\s(]+(?:\([^)]*\))?/, `${newSize}px`);
              if (updated !== cols) {
                ctx.container.style.gridTemplateColumns = updated;
              }
              target.style.width = `${newSize}px`;
            } else {
              target.style.height = `${newSize}px`;
            }
          }

          if (merged.onResize) merged.onResize(ratio);
        };

        const handleMouseUp = () => {
          resizer!.classList.remove('is-dragging');
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          activeMove = null;
          activeUp = null;
        };

        activeMove = handleMouseMove;
        activeUp = handleMouseUp;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };

      resizer.addEventListener('mousedown', onMouseDown);

      const STEP_PX = 20;

      const onKeyDown = (e: KeyboardEvent) => {
        const isVertical = direction === 'vertical';
        const decKey = isVertical ? 'ArrowLeft' : 'ArrowUp';
        const incKey = isVertical ? 'ArrowRight' : 'ArrowDown';

        if (e.key !== decKey && e.key !== incKey) return;
        e.preventDefault();

        const currentSize = isVertical
          ? (target?.clientWidth ?? minSize)
          : (target?.clientHeight ?? minSize);
        const delta = e.key === decKey ? -STEP_PX : STEP_PX;
        const newSize = Math.max(minSize, Math.min(maxSize, currentSize + delta));
        const containerSize = isVertical
          ? ctx.container.clientWidth
          : ctx.container.clientHeight;
        const ratio = newSize / (containerSize || 1);

        if (target) {
          if (isVertical) {
            const cols = ctx.container.style.gridTemplateColumns;
            const updated = cols.replace(/^[^\s(]+(?:\([^)]*\))?/, `${newSize}px`);
            if (updated !== cols) {
              ctx.container.style.gridTemplateColumns = updated;
            }
            target.style.width = `${newSize}px`;
          } else {
            target.style.height = `${newSize}px`;
          }
        }

        if (merged.onResize) merged.onResize(ratio);
      };

      resizer.addEventListener('keydown', onKeyDown);

      return {
        dispose() {
          resizer?.removeEventListener('mousedown', onMouseDown);
          resizer?.removeEventListener('keydown', onKeyDown);
          // Clean up leaked listeners if dispose called during active drag
          if (activeMove) document.removeEventListener('mousemove', activeMove);
          if (activeUp) document.removeEventListener('mouseup', activeUp);
          activeMove = null;
          activeUp = null;
          if (created) resizer?.remove();
        }
      };
    }
  };
}
