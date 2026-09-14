import type { ControlsSchema } from '../../platform/controls-schema';
import { galileoInclineConstants as C } from './scene.sim';

export const galileoInclineControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'theta2',
          label: '右侧斜面 θ₂',
          min: C.thetaMin,
          max: C.thetaMax,
          step: 1,
          value: C.defaultTheta2,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'mu',
          label: '动摩擦系数 μ',
          min: C.muMin,
          max: C.muMax,
          step: 0.01,
          value: C.defaultMu,
          unit: ''
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'release',
          label: '释放小球',
          variant: 'primary'
        },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示受力向量',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '复位', variant: 'secondary' }
      ]
    },
    {
      title: '极限',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['θ₂ → 0，μ → 0', 'a₂ → 0，匀速前进']
        }
      ]
    }
  ]
};
