import type { ControlsSchema } from '../../platform/controls-schema';
import { lightbulbConstants } from './scene.sim';
export const lightbulbControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '分压电路输入控制',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltage',
          label: '目标电压 U',
          min: lightbulbConstants.voltageMin,
          max: lightbulbConstants.voltageMax,
          step: 0.1,
          value: 2.9,
          unit: 'V'
        },
        { type: 'toggle', key: 'autoRun', label: '动态扫压', value: false }
      ]
    },
    {
      title: '实时数据与曲线',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showIdeal',
          label: '显示冷态理想直线',
          value: true
        },
        {
          type: 'button',
          key: 'recordPoint',
          label: '记录当前点',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'resetCurve',
          label: '清除记录',
          variant: 'secondary'
        }
      ]
    },
    {
      title: '原理',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['R = U/I', '灯丝升温 → 电阻增大', '分压调 U，记录 I']
        }
      ]
    }
  ]
};
