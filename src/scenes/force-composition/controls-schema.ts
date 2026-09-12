import type { ControlsSchema } from '../../platform/controls-schema';

export const forceCompositionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'tab',
          columns: 2,
          presets: [
            { id: 'synthesis', label: '合成法则' },
            { id: 'range', label: '合力范围' },
            { id: 'orthogonal', label: '正交分解' },
            { id: 'effect', label: '按效果分解' }
          ],
          initialActive: 'synthesis'
        }
      ]
    },
    {
      title: '两力参数',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'rule',
          columns: 2,
          presets: [
            { id: 'parallelogram', label: '平行四边形' },
            { id: 'triangle', label: '三角形法则' }
          ],
          initialActive: 'parallelogram'
        },
        {
          type: 'slider',
          key: 'f1',
          label: 'F₁',
          min: 10,
          max: 60,
          step: 1,
          value: 40,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'f2',
          label: 'F₂',
          min: 10,
          max: 60,
          step: 1,
          value: 30,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '夹角 θ',
          min: 0,
          max: 180,
          step: 1,
          value: 60,
          unit: '°'
        }
      ]
    },
    {
      title: '正交分解',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'orthogonalF',
          label: 'F',
          min: 10,
          max: 80,
          step: 1,
          value: 55,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'orthogonalAngle',
          label: 'θ',
          min: 0,
          max: 90,
          step: 1,
          value: 60,
          unit: '°'
        }
      ]
    },
    {
      title: '斜面分解',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'gravity',
          label: '重力 G',
          min: 10,
          max: 60,
          step: 5,
          value: 40,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'inclineAngle',
          label: '倾角 θ',
          min: 15,
          max: 60,
          step: 1,
          value: 30,
          unit: '°'
        }
      ]
    },
    {
      title: '范围演变',
      collapsed: true,
      fields: [
        {
          type: 'toggle',
          key: 'rangeSweep',
          label: '夹角往复',
          value: true
        }
      ]
    }
  ]
};
