/**
 * 螺旋测微器（千分尺）— 元数据
 */

import type { InstrumentMeta } from '../_contract/instrument-contract';
import type { SpiralMicrometerParams } from './instrument.sim';

export const spiralMicrometerMeta: InstrumentMeta<SpiralMicrometerParams> = {
  id: 'spiral-micrometer',
  title: '螺旋测微器',
  category: 'measurement',
  description: '千分尺：固定刻度 + 可旋转微分筒，精度 0.01mm，估读到 0.001mm',
  defaultParams: { reading: 6.725 },
  unit: 'mm',
  precision: 0.001
};
