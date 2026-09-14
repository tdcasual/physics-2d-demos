import type { ControlsSchema } from '../../platform/controls-schema';
import { carBankConstants as C } from './scene.sim';

export const carBankControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '弯道参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'bankAngle',
          label: '倾角 θ',
          min: C.angleMin,
          max: C.angleMax,
          step: 1,
          value: C.defaultAngle,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'speed',
          label: '车速 v',
          min: C.speedMin,
          max: C.speedMax,
          step: 0.5,
          value: C.defaultSpeed,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示力矢量',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '方程',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['N·sinθ + f·cosθ = Fₙ', 'N·cosθ − f·sinθ = G']
        }
      ]
    }
  ]
};
