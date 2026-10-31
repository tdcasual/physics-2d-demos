/**
 * 舞台交互零件：画布上可拖拽对象的指针 + 键盘 + 读屏统一实现。
 *
 * - 指针：命中后 setPointerCapture；坐标取 offsetX / offsetY（布局坐标，
 *   免疫舞台 CSS 缩放，不用 GBCR 求比例）
 * - 触屏：创建时 touch-action: none（手势开始前必须成立；pointerdown 里改无效）
 * - 命中才 preventDefault / capture；空白 onMiss，不拦截页面滚动意图之外的点击
 * - 键盘：画布可聚焦；Tab 在对象间切换（到边界放行），方向键移动（Shift ×10）
 * - 读屏：aria-live 播报「对象：状态」
 * - 不用 role="application"（全局方向键单步仍要在未聚焦手柄时生效）
 *
 * 场景提供 toModel / pick / move / commit / handles。
 */

import { applyTouchInteractionMode } from './touch';

export type StagePoint = { x: number; y: number };

export type StageHandle = {
  id: string;
  /** 读屏名称，如「小球 A」 */
  label: string;
  /** 当前位置（模型坐标），键盘移动以此为起点 */
  position(): StagePoint;
  /** 键盘单步（模型坐标）；缺省 0.01 */
  step?: number;
  /** 'x' / 'y' 限制键盘方向；缺省二维 */
  axis?: 'xy' | 'x' | 'y';
  /** 模型 y 轴向上（物理坐标）时为 true：↑ 增大 y；缺省按屏幕坐标（↑ 减小 y） */
  yUp?: boolean;
  /** 播报文本，如「x = 1.20 m」；缺省不播报位置 */
  describe?(): string;
};

export type StageInteractionOptions = {
  canvas: HTMLCanvasElement;
  /** CSS 局部坐标（相对画布左上角）→ 模型坐标 */
  toModel(
    local: StagePoint,
    size: { width: number; height: number }
  ): StagePoint;
  /** 命中测试：返回被按下的对象 id，没有则 null（不拦截事件） */
  pick(model: StagePoint): string | null;
  /** 拖动到模型坐标 */
  move(id: string, model: StagePoint): void;
  /** 一次拖动 / 键盘移动结束（写 URL 等）；可选 */
  commit?(id: string): void;
  /** 按下命中时（点击即落点的场景在此调用 move） */
  onPress?(id: string, model: StagePoint): void;
  /** 按下未命中 */
  onMiss?(model: StagePoint): void;
  /** 键盘可达的对象；缺省则只支持指针 */
  handles?(): readonly StageHandle[];
  /** 状态变化后重绘 */
  onChange?(): void;
  /** 读屏对画布的整体描述 */
  description?: string;
};

export type StageInteraction = {
  /** 当前键盘聚焦的对象（供 view 画焦点环） */
  focusedId(): string | null;
  /** 当前指针拖拽的对象 */
  draggingId(): string | null;
  focusTarget(id: string): void;
  dispose(): void;
};

const LIVE_REGION_STYLE =
  'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';

export function createStageInteraction(
  options: StageInteractionOptions
): StageInteraction {
  const { canvas } = options;
  const abort = new AbortController();
  const signal = abort.signal;
  let dragging: { id: string; pointerId: number } | null = null;
  let focusIndex = -1;

  const prevTabIndex = canvas.tabIndex;
  const prevRoleDesc = canvas.getAttribute('aria-roledescription');
  const prevDescription = canvas.getAttribute('aria-description');
  const prevTouchAction = canvas.style.touchAction;
  const hadSurface = canvas.classList.contains('touch-interaction-surface');
  const hadDrag = canvas.classList.contains('is-touch-drag');

  applyTouchInteractionMode(canvas, 'drag');
  const keyboard = Boolean(options.handles);
  if (keyboard) {
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-roledescription', '可拖拽舞台');
    if (options.description) {
      canvas.setAttribute('aria-description', options.description);
    }
  }

  const live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = LIVE_REGION_STYLE;
  canvas.parentElement?.appendChild(live);

  const localPoint = (event: PointerEvent): StagePoint => ({
    x: event.offsetX,
    y: event.offsetY
  });
  const size = () => ({
    width: canvas.clientWidth || canvas.width,
    height: canvas.clientHeight || canvas.height
  });
  const toModel = (event: PointerEvent): StagePoint =>
    options.toModel(localPoint(event), size());

  const announce = (handle: StageHandle | undefined): void => {
    if (!handle) return;
    const detail = handle.describe?.();
    live.textContent = detail ? `${handle.label}：${detail}` : handle.label;
  };

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const model = toModel(event);
      const id = options.pick(model);
      if (!id) {
        options.onMiss?.(model);
        return;
      }
      dragging = { id, pointerId: event.pointerId };
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // 合成事件或已释放的指针：忽略捕获失败
      }
      event.preventDefault();
      options.onPress?.(id, model);
    },
    { signal }
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;
      options.move(dragging.id, toModel(event));
      options.onChange?.();
    },
    { signal }
  );

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const { id } = dragging;
    dragging = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 已释放
    }
    options.commit?.(id);
    options.onChange?.();
  };
  canvas.addEventListener('pointerup', endDrag, { signal });
  canvas.addEventListener('pointercancel', endDrag, { signal });

  if (keyboard) {
    const handles = () => options.handles?.() ?? [];
    const focused = (): StageHandle | undefined => handles()[focusIndex];

    canvas.addEventListener(
      'focus',
      () => {
        if (focusIndex < 0 && handles().length > 0) focusIndex = 0;
        announce(focused());
        options.onChange?.();
      },
      { signal }
    );
    canvas.addEventListener(
      'blur',
      () => {
        focusIndex = -1;
        options.onChange?.();
      },
      { signal }
    );
    canvas.addEventListener(
      'keydown',
      (event) => {
        const list = handles();
        if (list.length === 0) return;
        if (event.key === 'Tab') {
          const next = focusIndex + (event.shiftKey ? -1 : 1);
          if (next < 0 || next >= list.length) return; // 放行，离开画布
          focusIndex = next;
          event.preventDefault();
          announce(list[focusIndex]);
          options.onChange?.();
          return;
        }
        if (event.key === 'Escape') {
          focusIndex = -1;
          canvas.blur();
          return;
        }
        const handle = list[focusIndex];
        if (!handle) return;
        const step = (handle.step ?? 0.01) * (event.shiftKey ? 10 : 1);
        const axis = handle.axis ?? 'xy';
        let dx = 0;
        let dy = 0;
        if (event.key === 'ArrowLeft' && axis !== 'y') dx = -step;
        else if (event.key === 'ArrowRight' && axis !== 'y') dx = step;
        else if (event.key === 'ArrowUp' && axis !== 'x')
          dy = handle.yUp ? step : -step;
        else if (event.key === 'ArrowDown' && axis !== 'x')
          dy = handle.yUp ? -step : step;
        else return;
        event.preventDefault();
        event.stopPropagation();
        const from = handle.position();
        options.move(handle.id, { x: from.x + dx, y: from.y + dy });
        options.commit?.(handle.id);
        announce(handle);
        options.onChange?.();
      },
      { signal }
    );
  }

  return {
    focusedId: () => options.handles?.()[focusIndex]?.id ?? null,
    draggingId: () => dragging?.id ?? null,
    focusTarget(id: string) {
      const list = options.handles?.() ?? [];
      const index = list.findIndex((handle) => handle.id === id);
      if (index < 0) return;
      focusIndex = index;
      canvas.focus();
      announce(list[index]);
      options.onChange?.();
    },
    dispose() {
      abort.abort();
      live.remove();
      canvas.tabIndex = prevTabIndex;
      if (prevRoleDesc === null) canvas.removeAttribute('aria-roledescription');
      else canvas.setAttribute('aria-roledescription', prevRoleDesc);
      if (prevDescription === null) canvas.removeAttribute('aria-description');
      else canvas.setAttribute('aria-description', prevDescription);
      canvas.style.touchAction = prevTouchAction;
      if (!hadDrag) canvas.classList.remove('is-touch-drag');
      if (!hadSurface) canvas.classList.remove('touch-interaction-surface');
    }
  };
}
