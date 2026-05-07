/**
 * 高精度干涉测微仪 — 元数据
 */

import type { InstrumentMeta, InstrumentParams } from '../_contract/instrument-contract';

export type ViewMode = 'crosshair' | 'fringe';

export interface MicrometerEyepieceParams extends InstrumentParams {
  /** 螺旋测微仪读数 */
  initialReading: number;
  /** 零位偏移（mm）— 校准后的基准 */
  zeroOffset: number;
  /** 十字准星位移（mm，正值=向左） */
  stripeOffset: number;
  /** 干涉条纹间距（px） */
  stripeSpacing: number;
  /** 干涉条纹颜色 */
  stripeColor: string;
  /** 干涉条纹角度（deg） */
  stripeAngle: number;
  /** 视场模式：crosshair=准星移动，fringe=条纹移动 */
  viewMode: ViewMode;
}

export const micrometerEyepieceMeta: InstrumentMeta<MicrometerEyepieceParams> = {
  id: 'micrometer-eyepiece',
  title: '高精度干涉测微仪',
  category: 'measurement',
  description: '带光学目镜和干涉条纹的螺旋测微器，可精确到 0.01mm',
  defaultParams: {
    initialReading: 0,
    zeroOffset: 0,
    stripeOffset: 12,
    stripeSpacing: 50,
    stripeColor: 'rgba(200, 80, 20, 0.4)',
    stripeAngle: 90,
    viewMode: 'crosshair',
  },
  unit: 'mm',
  precision: 0.01,
};
