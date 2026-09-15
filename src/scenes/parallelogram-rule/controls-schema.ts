import type { ControlsSchema } from '../../platform/controls-schema';
import { parallelogramConstants as C } from './scene.sim';

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
          min: C.f1Min,
          max: C.f1Max,
          step: 0.02,
          value: 1.82,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'f2',
          label: '分力 F₂',
          min: C.f2Min,
          max: C.f2Max,
          step: 0.02,
          value: 1.82,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '夹角 θ',
          min: C.angleMin,
          max: C.angleMax,
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
          lines: ['F′=F₁+F₂', '同点同向 → 等效']
        }
      ]
    }
  ]
};
