/**
 * 仪器组件库 — 轻量级清单（纯元数据）
 *
 * 设计原则：
 * - 此文件只包含纯数据（无函数、无导入），体积极小
 * - 注册表和审计页面列表直接读取此文件，无需加载任何组件代码
 * - 组件的工厂代码通过 import.meta.glob 按需动态加载
 * - 新增仪器时必须在此文件中注册，否则无法被发现
 */

import type {
  InstrumentCategory,
  InstrumentMeta
} from '../_contract/instrument-contract';

export type InstrumentManifestEntry = {
  /** 唯一标识，kebab-case */
  id: string;
  /** 显示名称 */
  title: string;
  /** 分类 — 与 InstrumentMeta.category 保持同步 */
  category: InstrumentCategory;
  /** 一句话描述 */
  description: string;
  /** 默认参数 */
  defaultParams: InstrumentMeta<Record<string, unknown>>['defaultParams'];
  /** 测量单位 */
  unit?: string;
  /** 精度 */
  precision?: number;
  /**
   * 模块路径 — 用于 import.meta.glob 匹配。
   * 必须与目录结构一致：/src/instruments/<id>/index.ts
   */
  modulePath: string;
};

/**
 * 仪器清单。
 *
 * 每条记录的默认参数必须与对应 instrument.meta.ts 完全一致；
 * 一致性由 instrument-manifest.spec.ts 在测试中校验。
 * 不按字母序排列 — 由注册表在运行时排序。
 */
export const instrumentManifest: InstrumentManifestEntry[] = [
  {
    id: 'spiral-micrometer',
    title: '螺旋测微器',
    category: 'measurement',
    description: '千分尺：固定刻度 + 可旋转微分筒，精度 0.01mm，估读到 0.001mm',
    defaultParams: { reading: 6.725 },
    unit: 'mm',
    precision: 0.001,
    modulePath: '/src/instruments/spiral-micrometer/index.ts'
  },
  {
    id: 'vernier-caliper',
    title: '游标卡尺',
    category: 'measurement',
    description: '主尺 + 游标尺，10/20/50 分度，精度 0.1/0.05/0.02mm',
    defaultParams: { precision: 0.02, objectType: 0 },
    unit: 'mm',
    precision: 0.02,
    modulePath: '/src/instruments/vernier-caliper/index.ts'
  },
  {
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
      viewMode: 'fringe'
    },
    unit: 'mm',
    precision: 0.01,
    modulePath: '/src/instruments/micrometer-eyepiece/index.ts'
  },
  {
    id: 'interference-vernier-caliper',
    title: '干涉读数游标卡尺',
    category: 'optical',
    description: '带双缝干涉条纹的干涉读数游标卡尺，50分度游标精度0.002cm',
    defaultParams: {
      initialReading: 1.4,
      zeroOffset: 0,
      fringeSpacing: 16,
      fringeBlur: 1.5,
      fringeOpacity: 0.85,
      fringeEnvelopeWidth: 320,
      fringeColor: 'rgba(30,15,0,0.85)'
    },
    unit: 'cm',
    precision: 0.002,
    modulePath: '/src/instruments/interference-vernier-caliper/index.ts'
  }
];
