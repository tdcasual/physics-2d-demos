/**
 * 高精度干涉测微仪 — 元数据
 */

import type { InstrumentMeta, InstrumentParams } from '../_contract/instrument-contract';

export interface MicrometerEyepieceParams extends InstrumentParams {
  /** 螺旋测微仪读数 */
  initialReading: number;
  /** 干涉条纹水平偏移（px） */
  stripeOffset: number;
  /** 干涉条纹间距（px） */
  stripeSpacing: number;
  /** 干涉条纹颜色 */
  stripeColor: string;
  /** 干涉条纹角度（deg） */
  stripeAngle: number;
}

export const micrometerEyepieceMeta: InstrumentMeta<MicrometerEyepieceParams> = {
  id: 'micrometer-eyepiece',
  title: '高精度干涉测微仪',
  category: 'measurement',
  description: '带光学目镜和干涉条纹的螺旋测微器，可精确到 0.01mm',
  defaultParams: {
    initialReading: 0.30,
    stripeOffset: 0,
    stripeSpacing: 50,
    stripeColor: 'rgba(200, 80, 20, 0.4)',
    stripeAngle: 90,
  },
  unit: 'mm',
  precision: 0.01,
};
