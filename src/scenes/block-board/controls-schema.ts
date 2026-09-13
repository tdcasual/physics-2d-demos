import type { ControlsSchema } from '../../platform/controls-schema';

export const blockBoardControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'blockMass',
          label: '木块质量 m',
          min: 0.5,
          max: 8,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'boardMass',
          label: '木板质量 M',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初速度 v₀',
          min: 0,
          max: 12,
          step: 1,
          value: 6,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'friction',
          label: '动摩擦因数 μ',
          min: 0.05,
          max: 0.8,
          step: 0.05,
          value: 0.2
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showArea', label: '显示相对位移', value: true },
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示摩擦力',
          value: false
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['f = μmg', 'a₁ = −μg', 'a₂ = μmg/M', '共速后 Δx 不变']
        }
      ]
    }
  ]
};
