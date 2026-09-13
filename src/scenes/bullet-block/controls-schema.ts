import type { ControlsSchema } from '../../platform/controls-schema';

export const bulletBlockControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: '子弹初速 v₀',
          min: 5,
          max: 45,
          step: 1,
          value: 25,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'bulletMass',
          label: '子弹质量 m',
          min: 0.2,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'blockMass',
          label: '木块质量 M',
          min: 1,
          max: 12,
          step: 0.5,
          value: 5,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '打入阻力 f',
          min: 5,
          max: 120,
          step: 5,
          value: 50,
          unit: 'N'
        }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['m·v₀=(m+M)v共', 'Q=ΔEₖ']
        }
      ]
    }
  ]
};
