import type { ControlsSchema } from '../../platform/controls-schema';

export const potentialGraphControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '电场情景',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'scenario',
          columns: 3,
          initialActive: 'segments',
          presets: [
            { id: 'segments', label: '分段匀强场' },
            { id: 'point', label: '单个正点电荷' },
            { id: 'dipole', label: '等量异种电荷' }
          ]
        }
      ]
    },
    {
      title: '试探电荷',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'probeCharge',
          columns: 2,
          initialActive: '1',
          presets: [
            { id: '1', label: '正电荷 (+q)' },
            { id: '-1', label: '负电荷 (-q)' }
          ]
        },
        {
          type: 'slider',
          key: 'chargeMagnitude',
          label: '电荷量 |q|',
          min: 0.5,
          max: 2,
          step: 0.5,
          value: 1,
          unit: 'μC'
        }
      ]
    },
    {
      title: '探针与图象',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'probePosition',
          label: '空间位置 x',
          min: 0.3,
          max: 9.7,
          step: 0.1,
          value: 7.58,
          unit: 'm'
        },
        {
          type: 'toggle',
          key: 'showTangent',
          label: '显示 φ-x 切线',
          value: true
        },
        {
          type: 'toggle',
          key: 'showArea',
          label: '显示 E-x 有向面积',
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
          lines: ['E = −dφ/dx', '∫E dx = φ₁ − φ₂', 'Uₚ = qφ，F = qE']
        }
      ]
    }
  ]
};
