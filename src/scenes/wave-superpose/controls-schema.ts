import type { ControlsSchema } from '../../platform/controls-schema';

export const waveSuperposeControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '波源 1 · 向右',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'direction1',
          columns: 2,
          initialActive: 'up',
          presets: [
            { id: 'up', label: '向上起振' },
            { id: 'down', label: '向下起振' }
          ]
        },
        {
          type: 'slider',
          key: 'amplitude1',
          label: '振幅 A₁',
          min: 0.5,
          max: 2,
          step: 0.1,
          value: 1.5,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'wavelength1',
          label: '波长 λ₁',
          min: 1,
          max: 4,
          step: 0.1,
          value: 2,
          unit: 'm'
        }
      ]
    },
    {
      title: '波源 2 · 向左',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'direction2',
          columns: 2,
          initialActive: 'down',
          presets: [
            { id: 'up', label: '向上起振' },
            { id: 'down', label: '向下起振' }
          ]
        },
        {
          type: 'slider',
          key: 'amplitude2',
          label: '振幅 A₂',
          min: 0.5,
          max: 2,
          step: 0.1,
          value: 1.5,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'wavelength2',
          label: '波长 λ₂',
          min: 1,
          max: 4,
          step: 0.1,
          value: 2,
          unit: 'm'
        }
      ]
    },
    {
      title: '观测',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'observationX',
          label: '观测点 x',
          min: -6,
          max: 6,
          step: 0.1,
          value: 0,
          unit: 'm'
        },
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
          lines: ['y = y₁ + y₂', '波峰相遇相长，峰谷相遇相消']
        }
      ]
    }
  ]
};
