/**
 * 仪器组件库 — 轻量级清单（纯元数据）
 *
 * 设计原则：
 * - 此文件只包含纯数据（无函数、无导入），体积极小
 * - 注册表和审计页面列表直接读取此文件，无需加载任何组件代码
 * - 组件的工厂代码通过 import.meta.glob 按需动态加载
 * - 新增仪器时必须在此文件中注册，否则无法被发现
 */

import type { InstrumentCategory, InstrumentMeta } from '../_contract/instrument-contract';

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
 * 当前为空，后续每添加一个仪器，在此数组中追加一条记录。
 * 不按字母序排列 — 由注册表在运行时排序。
 */
export const instrumentManifest: InstrumentManifestEntry[] = [
  {
    id: 'micrometer-eyepiece',
    title: '高精度干涉测微仪',
    category: 'measurement',
    description: '带光学目镜和干涉条纹的螺旋测微器，可精确到 0.01mm',
    defaultParams: { initialReading: 0.30, stripeOffset: 30, stripeSpacing: 50, stripeColor: 'rgba(200, 80, 20, 0.4)', stripeAngle: 90 },
    unit: 'mm',
    precision: 0.01,
    modulePath: '/src/instruments/micrometer-eyepiece/index.ts',
  },
];
