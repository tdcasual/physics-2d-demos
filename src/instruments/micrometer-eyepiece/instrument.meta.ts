/**
 * 高精度干涉测微仪 — 元数据
 */

import type { InstrumentMeta, InstrumentParams } from '../_contract/instrument-contract';

export interface MicrometerEyepieceParams extends InstrumentParams {
  initialReading: number;
}

export const micrometerEyepieceMeta: InstrumentMeta<MicrometerEyepieceParams> = {
  id: 'micrometer-eyepiece',
  title: '高精度干涉测微仪',
  category: 'measurement',
  description: '带光学目镜和干涉条纹的螺旋测微器，可精确到 0.01mm',
  defaultParams: {
    initialReading: 0.30,
  },
  unit: 'mm',
  precision: 0.01,
};
