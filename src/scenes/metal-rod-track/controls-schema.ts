import type { ControlsSchema } from '../../platform/controls-schema';

export const metalRodControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '运动模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'coast',
          presets: [
            { id: 'coast', label: '初速度阻尼滑行' },
            { id: 'pull', label: '恒定拉力加速' }
          ]
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'magneticField',
          label: '磁感应强度 B',
          min: 0,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '回路总电阻 R',
          min: 0.5,
          max: 4,
          step: 0.1,
          value: 2,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '金属棒质量 m',
          min: 0.2,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初始推入速度 v₀',
          min: 0,
          max: 24,
          step: 1,
          value: 20,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['E = BLv', 'I = E/R', 'Fₐ = BIL，方向与 v 相反']
        }
      ]
    }
  ]
};
