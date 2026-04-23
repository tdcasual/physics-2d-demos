/**
 * 共享类型定义
 */

export type ClickArea = {
  id: string;
  type: 'circle' | 'rect';
  x?: number;
  y?: number;
  r?: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OscillatorHistory = Array<{ t: number; x: number }>;

export type OscillatorDrawConfig = {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  maxSpringLength: number;
  displacementScale: number;
  ballRadius: number;
  labelFontSize: number;
  paramFontSize: number;
  minClickRadius: number;
};
