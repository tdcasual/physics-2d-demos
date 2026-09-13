import type { ControlsSchema } from '../../platform/controls-schema';

export const harmonicWaveControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '波参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'amplitude',
          label: '振幅 A',
          min: 1,
          max: 10,
          step: 1,
          value: 10,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'wavelength',
          label: '波长 λ',
          min: 1,
          max: 8,
          step: 1,
          value: 4,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'period',
          label: '周期 T',
          min: 0.5,
          max: 4,
          step: 0.5,
          value: 2,
          unit: 's'
        }
      ]
    },
    {
      title: '传播',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'direction',
          columns: 2,
          presets: [
            { id: 'right', label: '向右传播' },
            { id: 'left', label: '向左传播' }
          ],
          initialActive: 'right'
        }
      ]
    },
    {
      title: '观测',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'pointX',
          label: '质点 P',
          min: 0,
          max: 8,
          step: 0.5,
          value: 2,
          unit: 'm'
        },
        {
          type: 'toggle',
          key: 'showGhost',
          label: '显示微移波形',
          value: true
        },
        { type: 'toggle', key: 'showVelocity', label: '速度方向', value: true },
        {
          type: 'toggle',
          key: 'showAcceleration',
          label: '加速度方向',
          value: true
        }
      ]
    },
    {
      title: '公式',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['y = A sin 2π(t/T ∓ x/λ)', 'v = λ/T']
        }
      ]
    }
  ]
};
