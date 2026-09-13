import type { ControlsSchema } from '../../platform/controls-schema';
import { molecularConstants } from './scene.sim';

export const molecularControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'distanceRatio',
          label: '分子间距 r',
          min: molecularConstants.distanceMin,
          max: molecularConstants.distanceMax,
          step: 0.05,
          value: 1.55,
          unit: 'r₀'
        },
        {
          type: 'slider',
          key: 'epsilon',
          label: '势阱深度 ε',
          min: molecularConstants.epsilonMin,
          max: molecularConstants.epsilonMax,
          step: 0.25,
          value: 1,
          unit: '×'
        }
      ]
    },
    {
      title: '力分量',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showRepulsive',
          label: '显示斥力 F(斥)',
          value: true
        },
        {
          type: 'toggle',
          key: 'showAttractive',
          label: '显示引力 F(引)',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '热振动', value: false }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'button', key: 'playThermal', label: '播放热振动' },
        { type: 'button', key: 'reset', label: '复位', variant: 'danger' }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['F = F(斥) + F(引)', 'F = −dEₚ/dr', 'r = r₀：合力为零']
        }
      ]
    }
  ]
};
