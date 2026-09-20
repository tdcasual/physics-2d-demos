/**
 * 仪器组件库 — 统一导出入口
 *
 * 当前已注册 3 个仪器（micrometer-eyepiece、interference-vernier-caliper、
 * vernier-caliper-guide），注册与按需加载见 instrument-registry.ts。
 * 此文件仅导出合约接口和工具函数；每个仪器通过子目录独立导出，例如：
 *
 * ```ts
 * export { micrometerEyepieceFactory as micrometerEyepiece } from './micrometer-eyepiece/instrument.entry';
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
  InstrumentFactory
} from './_contract/instrument-contract';

// ── 工具函数 ──
export { withViewport, toAbsoluteViewport } from './_utils/viewport';
export { createInstrumentHost } from './mount';
export type {
  CreateInstrumentHostOptions,
  InstrumentHost,
  InstrumentHostDefinition,
  InstrumentPlacement
} from './mount';
