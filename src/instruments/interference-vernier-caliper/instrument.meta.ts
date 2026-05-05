/**
 * 干涉读数游标卡尺（双缝干涉测量）— 元数据
 */

import type { InstrumentMeta, InstrumentParams } from '../_contract/instrument-contract';

export interface InterferenceVernierCaliperParams extends InstrumentParams {
  /** 当前读数（cm） */
  initialReading: number;
  /** 零位修正（cm） */
  zeroOffset: number;
  /** 干涉条纹间距（px） */
  fringeSpacing: number;
  /** 条纹模糊度（SVG stdDeviation） */
  fringeBlur: number;
  /** 条纹基准不透明度（0–1） */
  fringeOpacity: number;
  /** 衍射包络半宽（px） */
  fringeEnvelopeWidth: number;
  /** 条纹颜色（rgba 字符串） */
  fringeColor: string;
}

export const interferenceVernierCaliperMeta: InstrumentMeta<InterferenceVernierCaliperParams> = {
  id: 'interference-vernier-caliper',
  title: '干涉读数游标卡尺',
  category: 'optical',
  description: '带双缝干涉条纹的干涉读数游标卡尺，50分度游标精度0.002cm',
  defaultParams: {
    initialReading: 1.400,
    zeroOffset: 0,
    fringeSpacing: 16,
    fringeBlur: 1.5,
    fringeOpacity: 0.85,
    fringeEnvelopeWidth: 320,
    fringeColor: 'rgba(30,15,0,0.85)',
  },
  unit: 'cm',
  precision: 0.002,
};
