import type { ControlsSchema } from '../../platform/controls-schema';
import { inclineSpringConstants as c } from './scene.sim';

export const inclineSpringControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '研究预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'resist',
          presets: [
            { id: 'smooth', label: '光滑斜面' },
            { id: 'resist', label: '普通阻尼' },
            { id: 'stuck', label: '临界不下滑' }
          ]
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'friction',
          label: '摩擦因数 μ',
          min: c.frictionMin,
          max: c.frictionMax,
          step: 0.01,
          value: c.defaultFriction
        },
        {
          type: 'slider',
          key: 'stiffness',
          label: '劲度系数 k',
          min: c.stiffnessMin,
          max: c.stiffnessMax,
          step: 5,
          value: c.defaultStiffness,
          unit: 'N/m'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '滑块质量 m',
          min: c.massMin,
          max: c.massMax,
          step: 0.1,
          value: c.defaultMass,
          unit: 'kg'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'button', key: 'reset', label: '置顶重置', variant: 'primary' },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['E总 = Ep + E弹 + Ek + Q', 'F弹 = kx']
        }
      ]
    }
  ]
};
