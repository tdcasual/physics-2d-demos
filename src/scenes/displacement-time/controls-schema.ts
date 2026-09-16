import type { ControlsSchema } from '../../platform/controls-schema';
import { displacementTimeConstants as C } from './scene.sim';

export const displacementTimeControlsSchema: ControlsSchema = {
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
        { type: 'toggle', key: 'showArea', label: '显示面积', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v = v₀ + at', 'x = v₀t + ½at²', 'v-t 面积 = 位移']
        }
      ]
    }
  ]
};
