import type { TeachingTheme, TeachingMode } from '../../../platform/standards';
import type { DemoRenderHints } from '../../../platform/demo-profile';

/**
 * 视图共享上下文。
 * 主工厂的可变状态（ctx / theme / 尺寸 / scale 等）在每次绘制调用时
 * 以快照形式显式传入各 renderer 模块，替代原有的闭包捕获。
 */
export type WedgeViewContext = {
  ctx: CanvasRenderingContext2D | null;
  graphCanvas: HTMLCanvasElement | null;
  graphCtx: CanvasRenderingContext2D | null;
  theme: TeachingTheme;
  mode: TeachingMode;
  demoHints: DemoRenderHints | undefined;
  cssWidth: number;
  cssHeight: number;
  scale: number;
};
