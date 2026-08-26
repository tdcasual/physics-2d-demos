/**
 * 双缝干涉公式推导 — 控制面板声明式配置
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const interferenceFormulaControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '光源',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'lambda',
          label: '波长',
          min: 400,
          max: 700,
          step: 1,
          value: 650,
          unit: 'nm'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'L',
          label: 'L（缝屏距）',
          min: 0.5,
          max: 3.0,
          step: 0.1,
          value: 1.0,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'd',
          label: 'd（缝间距）',
          min: 0.1,
          max: 1.0,
          step: 0.05,
          value: 0.5,
          unit: 'mm'
        }
      ]
    },
    {
      title: '推导步骤',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'step',
          columns: 2,
          presets: [
            { id: 'geometry', label: '1. 几何结构' },
            { id: 'path-diff', label: '2. 光程差' },
            { id: 'small-angle', label: '3. 小角近似' },
            { id: 'result', label: '4. 结论' }
          ],
          initialActive: 'geometry'
        }
      ]
    }
  ]
};
