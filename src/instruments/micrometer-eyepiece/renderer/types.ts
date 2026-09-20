/**
 * 高精度干涉测微仪 — 渲染器共享类型
 */

export type ViewMode = 'crosshair' | 'fringe';

export type MicrometerConfig = {
  initialReading: number;
  maxReading: number;
  tickGapX: number;
  tickGapY: number;
};

export type StripeConfig = {
  offset: number;
  spacing: number;
  color: string;
  angle: number;
};

export type MicrometerElements = {
  root: HTMLDivElement;
  sleeveContainer: HTMLDivElement;
  sleeveScales: HTMLDivElement;
  thimbleStrip: HTMLDivElement;
  thimbleGroup: HTMLDivElement;
  crosshairSystem: HTMLDivElement;
  lensView: HTMLDivElement;
  readoutDisplay: HTMLDivElement | null;
  hintEl: HTMLDivElement;
  caseEl: HTMLDivElement;
  systemEl: HTMLDivElement;
};

export type MicrometerListeners = {
  reading: Array<(reading: number) => void>;
  align: Array<() => void>;
  limit: Array<() => void>;
};

/**
 * 跨渲染子模块共享的可变视图状态。
 * 原实现是工厂闭包内的 let 变量，拆分后以共享对象显式传递，语义不变。
 */
export type MicrometerViewState = {
  crosshairSpeed: number;
  currentReading: number;
  zeroOffset: number;
  viewMode: ViewMode;
  disposed: boolean;
  simLastCrosshairAngle: number;
  sysX: number;
  sysY: number;
  systemScale: number;
};
