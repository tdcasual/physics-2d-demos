import type { ControlsSchema } from '../../platform/controls-schema';

export const chargedParticleControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showVelocity', label: '速度 v', value: true },
        { type: 'toggle', key: 'showForce', label: '洛伦兹力 F', value: true }
      ]
    },
    {
      title: '磁场方向',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'fieldDirection',
          columns: 2,
          initialActive: 'into',
          presets: [
            { id: 'into', label: '向里 (×)' },
            { id: 'out', label: '向外 (·)' }
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
          label: '质量 m',
          min: 1,
          max: 8,
          step: 1,
          value: 4
        },
        {
          type: 'slider',
          key: 'charge',
          label: '电荷量 q',
          min: -2,
          max: 2,
          step: 0.5,
          value: 1
        },
        {
          type: 'slider',
          key: 'velocity',
          label: '速度 v',
          min: 10,
          max: 80,
          step: 5,
          value: 40
        },
        {
          type: 'slider',
          key: 'magneticField',
          label: '磁感应强度 B',
          min: 0.2,
          max: 4,
          step: 0.2,
          value: 1,
          unit: 'T'
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
          lines: [
            'R = mv / |q|B',
            'T = 2πm / |q|B',
            '|F| = |q|vB',
            '洛伦兹力充当向心力，T 与 v 无关'
          ]
        }
      ]
    }
  ]
};
