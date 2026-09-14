import type { ControlsSchema } from '../../platform/controls-schema';
import { glassConstants } from './scene.sim';

export const glassControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '光路参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'incidentAngle',
          label: '入射角 i',
          min: glassConstants.angleMin,
          max: glassConstants.angleMax,
          step: 0.1,
          value: 48,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'refractiveIndex',
          label: '玻璃折射率 n',
          min: glassConstants.indexMin,
          max: glassConstants.indexMax,
          step: 0.01,
          value: 1.5
        },
        {
          type: 'slider',
          key: 'thickness',
          label: '玻璃厚度 d',
          min: glassConstants.thicknessMin,
          max: glassConstants.thicknessMax,
          step: 0.1,
          value: 5,
          unit: 'cm'
        }
      ]
    },
    {
      title: '演示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'autoRun',
          label: '光线动画',
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
          key: 'rule',
          lines: ['sin i = n · sin r', "i' = i", 'Δx = d · sin(i − r) / cos r']
        }
      ]
    }
  ]
};
