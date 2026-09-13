import type { ControlsSchema } from '../../platform/controls-schema';
import { electricFieldConstants as c } from './scene.sim';
export const electricFieldControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '电路状态',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'closed', label: '闭合电源主开关', value: true },
        {
          type: 'slider',
          key: 'voltage',
          label: '电源电压 U',
          min: c.voltageMin,
          max: c.voltageMax,
          step: 0.1,
          value: 3,
          unit: 'V'
        }
      ]
    },
    {
      title: '微观透视',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showSurfaceCharge',
          label: '显示表面电荷',
          value: true
        },
        { type: 'toggle', key: 'showDrift', label: '显示电子漂移', value: true }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [{ type: 'hint', key: 'rule', lines: ['E = U / L', 'v = μE'] }]
    }
  ]
};
