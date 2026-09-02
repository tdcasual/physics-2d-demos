/**
 * 游标卡尺使用演示 — 元数据
 *
 * 首个 renderTech: 'svg' 的仪器样例（刻度盘/读数窗类默认 SVG，
 * 见 src/instruments/STANDARDS.md 第 3 节）。
 */

import type { InstrumentMeta } from '../_contract/instrument-contract';
import type { VernierCaliperGuideParams } from './instrument.sim';

export const vernierCaliperGuideMeta: InstrumentMeta<VernierCaliperGuideParams> =
  {
    id: 'vernier-caliper-guide',
    title: '游标卡尺使用演示',
    category: 'measurement',
    description:
      '完整解剖（内/外测量爪、深度尺、紧固螺钉），演示外径/内径/深度三种测量与读数练习',
    defaultParams: {
      precision: 0.1,
      mode: 0,
      jawPosition: 23.7,
      showReading: 1,
      demo: 0
    },
    unit: 'mm',
    precision: 0.1,
    renderTech: 'svg'
  };
