import type { ControlsSchema } from '../../platform/controls-schema';
import { inductionAcceleratorConstants as C } from './scene.sim';
export const inductionAcceleratorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '磁场参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'dBdt',
          label: '中心磁场变化率 ΔB/Δt',
          min: C.dBdtMin,
          max: C.dBdtMax,
          step: 0.5,
          value: C.dBdtDefault,
          unit: 'T/s'
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
          label: '显示受力矢量',
          value: true
        },
        { type: 'toggle', key: 'slowMode', label: '慢速模式', value: false },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'button',
          key: 'relaunch',
          label: '重新发射',
          variant: 'primary'
        },
        { type: 'button', key: 'reset', label: '复位', variant: 'secondary' }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['B轨 = ½ B内均', '感生电场使电子切向加速']
        }
      ]
    }
  ]
};
