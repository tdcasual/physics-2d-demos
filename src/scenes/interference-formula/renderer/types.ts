/**
 * 双缝干涉 — 绘制参数类型
 */

export type GeoBase = {
  text: string;
  dim: string;
  accent: string;
  plateX: number;
  screenX: number;
  centerY: number;
  slitTop: number;
  slitBot: number;
  screenTop: number;
  screenBot: number;
  pY: number;
  scale: number;
  modeScale: number;
};

export type GeoBaseLite = {
  text: string;
  dim: string;
  accent: string;
  plateX: number;
  screenX: number;
  centerY: number;
  slitTop: number;
  slitBot: number;
  pY: number;
  scale: number;
  modeScale: number;
};

export type GeoPhase = GeoBaseLite & {
  w: number;
  h: number;
  params: { lambda: number; L: number; d: number };
};

export type PathDiffPhase = GeoPhase & { deltaX: number };

export type SmallAnglePhase = GeoBase & {
  w: number;
  h: number;
  params: { lambda: number; L: number; d: number };
  deltaX: number;
};
