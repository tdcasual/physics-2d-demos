import type { ControlsSchema } from '../../platform/controls-schema';
import { threeForcesConstants as C } from './scene.sim';

export const threeForcesControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '性质力',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'tab',
          columns: 3,
          presets: [
            { id: 'gravity', label: '重力' },
            { id: 'friction', label: '摩擦力' },
            { id: 'spring', label: '弹力' }
          ],
          initialActive: 'gravity'
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
          min: C.massMin,
          max: C.massMax,
          step: 0.5,
          value: C.massDefault,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'inclineAngle',
          label: '斜面角 θ',
          min: C.angleMin,
          max: C.angleMax,
          step: 1,
          value: C.angleDefault,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'mu',
          label: '摩擦因数 μ',
          min: C.muMin,
          max: C.muMax,
          step: 0.05,
          value: C.muDefault
        }
      ]
    },
    {
      title: '弹簧',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'springK',
          label: '劲度系数 k',
          min: C.springKMin,
          max: C.springKMax,
          step: 1,
          value: C.springKDefault,
          unit: 'N/m'
        },
        {
          type: 'slider',
          key: 'springX',
          label: '形变量 x',
          min: C.springXMin,
          max: C.springXMax,
          step: 0.01,
          value: C.springXDefault,
          unit: 'm'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '显示分解',
          value: true
        }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'G = mg',
            'G₁ = G sinθ',
            'G₂ = G cosθ',
            'f ≤ μN',
            'F弹 = −kx，|F弹| = kx'
          ]
        }
      ]
    }
  ]
};
