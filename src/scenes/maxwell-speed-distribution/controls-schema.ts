import type { ControlsSchema } from '../../platform/controls-schema';
import { maxwellConstants as C } from './scene.sim';
export const maxwellControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '热力学参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'temperature',
          label: '温度 T',
          min: C.temperatureMin,
          max: C.temperatureMax,
          step: 10,
          value: 600,
          unit: 'K'
        },
        {
          type: 'slider',
          key: 'molarMass',
          label: '摩尔质量 M',
          min: C.molarMassMin,
          max: C.molarMassMax,
          step: 1,
          value: 28,
          unit: 'g/mol'
        }
      ]
    },
    {
      title: '动画',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '分子运动', value: true }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'vₚ = √(2RT/M)',
            'v̄ = √(8RT/πM)',
            'vᵣₘₛ = √(3RT/M)',
            '曲线下面积恒定'
          ]
        }
      ]
    }
  ]
};
