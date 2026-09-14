import type { ControlsSchema } from '../../platform/controls-schema';
import { locomotiveConstants as C } from './scene.sim';

export const locomotiveControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '启动模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'power',
          presets: [
            { id: 'power', label: '恒功率启动' },
            { id: 'acceleration', label: '恒加速度启动' }
          ]
        }
      ]
    },
    {
      title: '物理参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'ratedPower',
          label: '功率 P额',
          min: C.ratedPowerMin,
          max: C.ratedPowerMax,
          step: 1,
          value: C.defaultRatedPower,
          unit: 'kW'
        },
        {
          type: 'slider',
          key: 'acceleration',
          label: '加速度 a₀',
          min: C.accelerationMin,
          max: C.accelerationMax,
          step: 0.1,
          value: C.defaultAcceleration,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'dragForce',
          label: '恒定阻力 f',
          min: C.dragMin,
          max: C.dragMax,
          step: 50,
          value: C.defaultDrag,
          unit: 'N'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['P = F · v', 'F合 = F − f', '恒功率：v↑ → F↓ → a↓']
        }
      ]
    }
  ]
};
