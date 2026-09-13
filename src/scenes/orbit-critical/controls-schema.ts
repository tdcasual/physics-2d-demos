import type { ControlsSchema } from '../../platform/controls-schema';
export const orbitCriticalControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          initialActive: 'rope',
          presets: [
            { id: 'rope', label: '绳模型' },
            { id: 'rod', label: '杆模型' }
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
          key: 'bottomSpeed',
          label: '底部初速度 v₀',
          min: 0,
          max: 12,
          step: 0.1,
          value: 4.2,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'radius',
          label: '轨道半径 R',
          min: 0.5,
          max: 3,
          step: 0.1,
          value: 1.5,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: 1,
          max: 15,
          step: 0.1,
          value: 9.8,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '位置角 θ',
          min: -180,
          max: 180,
          step: 1,
          value: -50,
          unit: '°'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示受力', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['绳：v₀ ≥ √(5gR)', '最高点：v² ≥ gR']
        }
      ]
    }
  ]
};
