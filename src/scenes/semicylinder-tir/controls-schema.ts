import type { ControlsSchema } from '../../platform/controls-schema';
import { tirConstants } from './scene.sim';

export const tirControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '物理参数设定',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'refractiveIndex',
          label: '介质折射率 n',
          min: tirConstants.indexMin,
          max: tirConstants.indexMax,
          step: 0.01,
          value: 1.5
        },
        {
          type: 'slider',
          key: 'height',
          label: '入射高度 h',
          min: tirConstants.heightMin,
          max: tirConstants.heightMax,
          step: 0.01,
          value: 5.24,
          unit: 'cm'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'jumpCritical',
          label: '跳至临界点',
          variant: 'primary'
        },
        {
          type: 'toggle',
          key: 'autoRun',
          label: '自动演示',
          value: true
        }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['sin θc = 1 / n', '当 θ₁ ≥ θc 时发生全反射']
        }
      ]
    }
  ]
};
