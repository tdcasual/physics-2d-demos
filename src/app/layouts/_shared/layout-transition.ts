/**
 * 布局切换过渡动画
 *
 * 为布局的 enter/exit 提供统一的过渡动画实现（fade / slide / scale）。
 * 基于 Web Animations API；在以下情况会立即完成（不做动画）：
 * - `transition.type === 'none'`
 * - `duration <= 0` 或非有限值
 * - 环境不支持 `Element.animate`（如 happy-dom 测试环境）
 * - 用户系统偏好「减少动态效果」（prefers-reduced-motion: reduce）
 *
 * 具备中断保护：在同一元素上启动新动画时，会先取消仍在进行的旧动画，
 * 避免布局快速切换时动画叠加或卡在半透明状态。
 */

import type { LayoutTransition } from '../types';

/** 记录每个元素当前正在进行的动画，用于中断保护 */
const activeAnimations = new WeakMap<HTMLElement, Animation>();

/** 用户是否偏好减少动态效果 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 判断当前环境/配置是否应真正执行动画 */
function shouldAnimate(el: HTMLElement, transition: LayoutTransition): boolean {
  if (transition.type === 'none') return false;
  if (!Number.isFinite(transition.duration) || transition.duration <= 0) {
    return false;
  }
  if (typeof el.animate !== 'function') return false;
  if (prefersReducedMotion()) return false;
  return true;
}

/**
 * 计算进入/退出动画的关键帧
 *
 * enter: 从隐藏态（透明 + 位移/缩放）过渡到自然态（不透明、无变换）
 * exit:  从自然态过渡到隐藏态
 */
function buildKeyframes(
  type: LayoutTransition['type'],
  phase: 'enter' | 'exit'
): Keyframe[] {
  let hiddenTransform = 'none';
  if (type === 'slide') hiddenTransform = 'translateX(24px)';
  else if (type === 'scale') hiddenTransform = 'scale(0.97)';

  const hidden: Keyframe = { opacity: 0, transform: hiddenTransform };
  const visible: Keyframe = { opacity: 1, transform: 'none' };

  return phase === 'enter' ? [hidden, visible] : [visible, hidden];
}

/** 在元素上运行一段过渡动画；中断时静默 resolve，从不 reject */
function runTransition(
  el: HTMLElement,
  transition: LayoutTransition,
  phase: 'enter' | 'exit'
): Promise<void> {
  // 中断保护：取消该元素上仍在进行的动画
  const running = activeAnimations.get(el);
  if (running) {
    running.cancel();
    activeAnimations.delete(el);
  }

  if (!shouldAnimate(el, transition)) {
    return Promise.resolve();
  }

  const animation = el.animate(buildKeyframes(transition.type, phase), {
    duration: transition.duration,
    easing: transition.easing || 'ease-in-out',
    fill: 'both'
  });
  activeAnimations.set(el, animation);

  return animation.finished
    .catch(() => {
      /* 动画被取消（中断）— 静默处理 */
    })
    .then(() => {
      if (activeAnimations.get(el) === animation) {
        activeAnimations.delete(el);
      }
      if (phase === 'enter') {
        // enter 完成后取消动画，避免 fill 样式覆盖布局自身的 CSS。
        // 自然态即结束态（不透明、无变换），取消后视觉无变化。
        try {
          animation.cancel();
        } catch {
          /* 已结束或环境不支持 — 忽略 */
        }
      }
      // exit 保留结束态（透明）直到容器移除元素，避免移除前闪烁。
    });
}

/** 布局进入动画 */
export function enterLayout(
  el: HTMLElement,
  transition: LayoutTransition
): Promise<void> {
  return runTransition(el, transition, 'enter');
}

/** 布局退出动画 */
export function exitLayout(
  el: HTMLElement,
  transition: LayoutTransition
): Promise<void> {
  return runTransition(el, transition, 'exit');
}
