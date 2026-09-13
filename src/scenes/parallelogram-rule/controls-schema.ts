import type { ControlsSchema } from '../../platform/controls-schema';

export const parallelogramControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '步骤',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'stage',
          columns: 3,
          presets: [
            { id: 'components', label: '画分力' },
            { id: 'construct', label: '作图' },
            { id: 'compare', label: '对比' }
          ],
          initialActive: 'components'
        }
      ]
    },
    {
      title: '力与夹角',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'f1',
          label: '分力 F₁',
          min: 0.5,
          max: 4,
          step: 0.1,
          value: 1.8,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'f2',
          label: '分力 F₂',
          min: 0.5,
          max: 4,
          step: 0.1,
          value: 1.8,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '夹角 θ',
          min: 20,
          max: 160,
          step: 1,
          value: 90,
          unit: '°'
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
          lines: ['F′=F₁+F₂', '同点 → 等效']
        }
      ]
    }
  ]
};
