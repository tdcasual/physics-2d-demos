import type { ControlsSchema } from '../../platform/controls-schema';
import { uvtConstants as C } from './scene.sim';

export const uvtControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '运动参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'v0',
          label: '初速度 v₀',
          min: C.v0Min,
          max: C.v0Max,
          step: 1,
          value: C.v0Default,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'acceleration',
          label: '加速度 a',
          min: C.accelerationMin,
          max: C.accelerationMax,
          step: 1,
          value: C.accelerationDefault,
          unit: 'm/s²'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动运行', value: true },
        { type: 'toggle', key: 'showArea', label: '显示面积', value: true }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['斜率 = a，面积 = x']
        }
      ]
    }
  ]
};
