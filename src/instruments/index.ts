/**
 * 仪器组件库 — 统一导出入口
 *
 * 当前尚无仪器注册，此文件仅导出合约接口和工具函数。
 * 未来每个仪器通过子目录独立导出，例如：
 *
 * ```ts
 * export { micrometer } from './micrometer';
 * export { vernierCaliper } from './vernier-caliper';
 * export { stopwatch } from './stopwatch';
 * ```
 */

// ── 合约接口 ──
export type {
  InstrumentParams,
  InstrumentState,
  InstrumentSim,
  InstrumentView,
  InstrumentViewport,
  InstrumentMeta,
  InstrumentCategory,
  InstrumentFactory,
} from './_contract/instrument-contract';

// ── 工具函数 ──
export { withViewport, toAbsoluteViewport } from './_utils/viewport';
