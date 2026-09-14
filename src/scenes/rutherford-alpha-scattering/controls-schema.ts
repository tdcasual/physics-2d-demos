import type { ControlsSchema } from '../../platform/controls-schema';

export const rutherfordControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型与束流',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          presets: [
            { id: 'plum', label: '枣糕模型' },
            { id: 'nuclear', label: '核式结构' }
          ],
          initialActive: 'nuclear'
        },
        {
          type: 'slider',
          key: 'aim',
          label: '瞄准偏移',
          min: -260,
          max: 260,
          step: 20,
          value: 0,
          unit: ' px'
        },
        {
          type: 'slider',
          key: 'beamEnergy',
          label: '束流能量',
          min: 0.7,
          max: 1.4,
          step: 0.1,
          value: 1,
          unit: '×'
        },
        { type: 'toggle', key: 'autoRun', label: '持续发射', value: true }
      ]
    },
    {
      title: '观察图层',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示受力矢量',
          value: true
        },
        {
          type: 'button',
          key: 'fireBeam',
          label: '发射特定瞄准距粒子束',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'toggleModel',
          label: '切换两种原子模型',
          variant: 'secondary'
        },
        {
          type: 'button',
          key: 'reset',
          label: '重置轨迹',
          variant: 'secondary'
        }
      ]
    },
    {
      title: '原理',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['F = kQq / r²', 'a = F / m', 'v = v₀ + aΔt']
        }
      ]
    }
  ]
};
