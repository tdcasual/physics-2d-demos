/**
 * 薄膜干涉 — 控制面板
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const thinFilmControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '厚度分布',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'profile',
          columns: 2,
          presets: [
            { id: 'linear', label: '均匀变化', desc: '条纹等间距' },
            { id: 'quad', label: '非均匀变化', desc: '下密上疏' }
          ],
          initialActive: 'linear'
        }
      ]
    },
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
          value: 550,
          unit: 'nm'
        },
        {
          type: 'toggle',
          key: 'whiteLight',
          label: '白光模式',
          value: false
        }
      ]
    },
    {
      title: '薄膜参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'dTop',
          label: '顶厚',
          min: 0,
          max: 1000,
          step: 10,
          value: 100,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'dBottom',
          label: '底厚',
          min: 100,
          max: 2000,
          step: 10,
          value: 800,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'n',
          label: '折射率',
          min: 1.0,
          max: 2.5,
          step: 0.05,
          value: 1.33,
          unit: ''
        }
      ]
    },
    {
      title: '观察点',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'cursorY',
          label: '位置',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
          unit: '%'
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
            { id: 'half-wave', label: '3. 半波损失' },
            { id: 'result', label: '4. 结论' }
          ],
          initialActive: 'geometry'
        }
      ]
    }
  ]
};
