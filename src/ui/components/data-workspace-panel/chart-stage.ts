/**
 * 图像分析环节的两区包裹层（表 + 分隔条 + 图）与分栏比例控制器。
 * 从 createDataWorkspacePanel 抽出（debt-ledger A4 拆分）：本工厂只负责
 * chartStage/splitter 元素与拖拽/键盘/持久化的分栏逻辑；reviewEl 与
 * chartMount 由调用方组装进 chartStage。
 */

import type { DataWorkspaceSpec } from '../../../platform/data-workspace';

export type ChartStageController = {
  chartStage: HTMLElement;
  splitter: HTMLElement;
  /** content 模式下按表格实际高度同步 aria 分隔条读数。 */
  syncContentSeparator(): void;
  /** 按存储/even/content 策略初始化分栏（挂载与窗口 resize 时调用）。 */
  chooseIdleSplit(): void;
};

const SPLIT_MIN = 0.18;
const SPLIT_MAX = 0.72;

export function createChartStageController(options: {
  spec: DataWorkspaceSpec;
  ac: AbortController;
}): ChartStageController {
  const { spec, ac } = options;

  const chartStage = document.createElement('div');
  chartStage.className = 'data-workspace-chart-stage';
  const splitter = document.createElement('div');
  splitter.className = 'data-workspace-splitter';
  splitter.setAttribute('role', 'separator');
  splitter.setAttribute('aria-orientation', 'horizontal');
  splitter.setAttribute('aria-valuemin', '18');
  splitter.setAttribute('aria-valuemax', '72');
  splitter.setAttribute('aria-label', '调整表格与图表分界');
  splitter.tabIndex = 0;
  splitter.hidden = true;

  const splitStorageKey = `dw-split-fit-${spec.id}`;
  let splitMode: 'content' | 'manual' | 'even' = 'content';

  function readStoredSplit(): number | null {
    try {
      const stored = Number(window.localStorage.getItem(splitStorageKey));
      if (
        Number.isFinite(stored) &&
        stored >= SPLIT_MIN &&
        stored <= SPLIT_MAX
      ) {
        return stored;
      }
    } catch {
      /* storage may be unavailable in private or embedded browsing contexts */
    }
    return null;
  }

  function measuredSplitRatio(stage: HTMLElement): number | null {
    const review = stage.querySelector('.data-workspace-review');
    const height = stage.clientHeight || stage.getBoundingClientRect().height;
    if (!(review instanceof HTMLElement) || !(height > 0)) return null;
    const reviewHeight = review.getBoundingClientRect().height;
    if (!(reviewHeight > 0)) return null;
    return reviewHeight / height;
  }

  function currentSplitRatio(stage: HTMLElement): number {
    if (splitMode === 'even') return 0.5;
    if (splitMode === 'manual') {
      const parsed =
        Number.parseFloat(stage.style.getPropertyValue('--dw-split')) / 100;
      if (Number.isFinite(parsed)) return parsed;
    }
    return measuredSplitRatio(stage) ?? SPLIT_MIN;
  }

  function applySplitRatio(ratio: number, persist = true): void {
    const clamped = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ratio));
    splitMode = 'manual';
    chartStage.setAttribute('data-split-mode', 'manual');
    chartStage.style.setProperty(
      '--dw-split',
      `${(clamped * 100).toFixed(2)}%`
    );
    announceSeparator(clamped, false);
    if (!persist) return;
    try {
      window.localStorage.setItem(
        splitStorageKey,
        String(Math.round(clamped * 1000) / 1000)
      );
    } catch {
      /* 私密模式等存储不可用时静默 */
    }
  }

  /**
   * aria-valuenow must stay inside aria-valuemin/max. Content-fit can be
   * shorter than 18%; the announced value is clamped, and aria-valuetext
   * still says the split is following the table.
   */
  function announceSeparator(ratio: number, content: boolean): void {
    const announced = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ratio));
    splitter.setAttribute('aria-valuenow', String(Math.round(announced * 100)));
    if (content) splitter.setAttribute('aria-valuetext', '按表格内容');
    else splitter.removeAttribute('aria-valuetext');
  }

  function useContentSplit(): void {
    splitMode = 'content';
    chartStage.setAttribute('data-split-mode', 'content');
    chartStage.style.removeProperty('--dw-split');
    const measured = measuredSplitRatio(chartStage);
    announceSeparator(measured ?? SPLIT_MIN, true);
  }

  function useEvenSplit(): void {
    splitMode = 'even';
    chartStage.setAttribute('data-split-mode', 'even');
    chartStage.style.removeProperty('--dw-split');
    splitter.setAttribute('aria-valuenow', '50');
    splitter.setAttribute('aria-valuetext', '上下各半');
  }

  function viewportAllowsEven(): boolean {
    return typeof window !== 'undefined' && window.innerHeight >= 640;
  }

  /** Stored manual ratios win. Even is only the untouched default. */
  function chooseIdleSplit(): void {
    if (splitMode === 'manual') return;
    const stored = readStoredSplit();
    if (stored != null) {
      applySplitRatio(stored, false);
      return;
    }
    if (spec.chartEvenSplit === true && viewportAllowsEven()) {
      useEvenSplit();
      return;
    }
    useContentSplit();
  }

  function syncContentSeparator(): void {
    if (splitMode !== 'content') return;
    const measured = measuredSplitRatio(chartStage);
    announceSeparator(measured ?? SPLIT_MIN, true);
  }

  function bindSplitter(handle: HTMLElement, stage: HTMLElement): void {
    const ratioFromPointer = (clientY: number): number => {
      const rect = stage.getBoundingClientRect();
      // 相对「表+分隔条+图」包裹层的高度换算拖拽比例；包裹层不在
      // 舞台 transform 内，不违反舞台缩放坐标纪律。
      const height = stage.clientHeight || rect.height;
      if (height <= 0) return SPLIT_MIN;
      return Math.max(
        SPLIT_MIN,
        Math.min(SPLIT_MAX, (clientY - rect.top) / height)
      );
    };
    handle.addEventListener(
      'pointerdown',
      (event) => {
        try {
          if (typeof handle.setPointerCapture === 'function') {
            handle.setPointerCapture(event.pointerId);
          }
        } catch {
          /* capture is optional; move events still update the ratio */
        }
        applySplitRatio(ratioFromPointer(event.clientY));
        const move = (moveEvent: PointerEvent): void => {
          applySplitRatio(ratioFromPointer(moveEvent.clientY));
        };
        const up = (): void => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      },
      { signal: ac.signal }
    );
    handle.addEventListener(
      'keydown',
      (event) => {
        const current = currentSplitRatio(stage);
        const step =
          event.key === 'PageUp' || event.key === 'PageDown' ? 0.05 : 0.01;
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault();
          applySplitRatio(current - step);
        } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          event.preventDefault();
          applySplitRatio(current + step);
        } else if (event.key === 'Home') {
          event.preventDefault();
          applySplitRatio(SPLIT_MIN);
        } else if (event.key === 'End') {
          event.preventDefault();
          applySplitRatio(SPLIT_MAX);
        }
      },
      { signal: ac.signal }
    );
  }

  chooseIdleSplit();
  bindSplitter(splitter, chartStage);
  window.addEventListener('resize', chooseIdleSplit, { signal: ac.signal });

  return {
    chartStage,
    splitter,
    syncContentSeparator,
    chooseIdleSplit
  };
}
