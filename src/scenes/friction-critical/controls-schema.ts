import type { ControlsSchema } from '../../platform/controls-schema';
import { frictionConstants } from './scene.sim';
export const frictionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'single',
          presets: [
            { id: 'single', label: '单物块临界' },
            { id: 'stacked', label: '叠加体滑动' }
          ]
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'force',
          label: '外力 F',
          min: frictionConstants.forceMin,
          max: frictionConstants.forceMax,
          step: 0.5,
          value: 21.5,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '物块质量 m',
          min: frictionConstants.massMin,
          max: frictionConstants.massMax,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'muK',
          label: '动摩擦因数 μₖ',
          min: frictionConstants.muMin,
          max: frictionConstants.muMax,
          step: 0.05,
          value: 0.4,
          unit: ''
        }
      ]
    },
    {
      title: '叠加体',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'upperMass',
          label: '上块质量',
          min: frictionConstants.massMin,
          max: frictionConstants.massMax,
          step: 0.5,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'lowerMass',
          label: '下块质量',
          min: frictionConstants.massMin,
          max: frictionConstants.massMax,
          step: 0.5,
          value: 2,
          unit: 'kg'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: false },
        { type: 'button', key: 'reset', label: '复位', variant: 'danger' }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['f ≤ fₘₐₓ：静摩擦', 'fₖ = μₖN', 'F > fₘₐₓ：开始滑动']
        }
      ]
    }
  ]
};
