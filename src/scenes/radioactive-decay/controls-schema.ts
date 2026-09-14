import type { ControlsSchema } from '../../platform/controls-schema';
import { radioactiveConstants as C } from './scene.sim';
export const radioactiveControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'halfLife',
          label: '半衰期 T',
          min: C.halfLifeMin,
          max: C.halfLifeMax,
          step: 0.1,
          value: C.defaultHalfLife,
          unit: 's'
        }
      ]
    },
    {
      title: '动画',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动衰变', value: true }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['N(t) = N₀(1/2)^(t/T)', '微观随机，宏观稳定']
        }
      ]
    }
  ]
};
