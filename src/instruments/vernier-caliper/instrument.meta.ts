/**
 * 游标卡尺 — 元数据
 */

import type { InstrumentMeta } from '../_contract/instrument-contract';
import type { VernierCaliperParams } from './instrument.sim';

export const vernierCaliperMeta: InstrumentMeta<VernierCaliperParams> = {
  id: 'vernier-caliper',
  title: '游标卡尺',
  category: 'measurement',
  description: '主尺 + 游标尺，10/20/50 分度，精度 0.1/0.05/0.02mm',
  defaultParams: { precision: 0.02, objectType: 0 },
  unit: 'mm',
  precision: 0.02
};
