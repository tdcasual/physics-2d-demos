import type { ControlsSchema } from '../../platform/controls-schema';

export const impulseMomentumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '外力模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'forceModel',
          columns: 2,
          initialActive: 'constant',
          presets: [
            { id: 'constant', label: '恒力模型' },
            { id: 'triangle', label: '三角形碰撞力' },
            { id: 'halfSine', label: '正弦半波冲击' },
            { id: 'ramp', label: '先增后恒力' }
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
          key: 'mass',
          label: '滑块质量 m',
          min: 0.5,
          max: 4,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初速度 v₀',
          min: -4,
          max: 8,
          step: 0.5,
          value: 0,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'peakForce',
          label: '力峰值 Fₘₐₓ',
          min: 2,
          max: 20,
          step: 1,
          value: 10,
          unit: 'N'
        },
        {
          type: 'toggle',
          key: 'showArea',
          label: '显示有向面积',
          value: true
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Iₓ = ∫Fₓ dt = Δpₓ = m(vₓ − v₀)', 'pₓ = p₀ + Iₓ']
        }
      ]
    }
  ]
};
