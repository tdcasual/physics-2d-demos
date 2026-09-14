import type { ControlsSchema } from '../../platform/controls-schema';
import { conicalPendulumConstants as C } from './scene.sim';

export const conicalPendulumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '圆锥摆参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'height',
          label: '悬点高度 h',
          min: C.heightMin,
          max: C.heightMax,
          step: 0.1,
          value: C.defaultHeight,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'theta',
          label: '摆角 θ',
          min: C.thetaMin,
          max: C.thetaMax,
          step: 1,
          value: C.defaultTheta,
          unit: '°'
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
          label: '显示受力向量',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        { type: 'hint', key: 'formula', lines: ['Fₙ = mg·tanθ', 'ω = √(g/h)'] }
      ]
    }
  ]
};
