import type { ControlsSchema } from '../../platform/controls-schema';
import { blockBoardConstants as C } from './scene.sim';

export const blockBoardControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'blockMass',
          label: '木块质量 m',
          min: C.blockMassMin,
          max: C.blockMassMax,
          step: 0.5,
          value: C.blockMassDefault,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'boardMass',
          label: '木板质量 M',
          min: C.boardMassMin,
          max: C.boardMassMax,
          step: 0.5,
          value: C.boardMassDefault,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初速度 v₀',
          min: C.v0Min,
          max: C.v0Max,
          step: 1,
          value: C.v0Default,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'friction',
          label: '动摩擦因数 μ',
          min: C.frictionMin,
          max: C.frictionMax,
          step: 0.05,
          value: C.frictionDefault
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showArea', label: '显示 Δx 面积', value: true },
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示摩擦力',
          value: false
        },
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
          lines: [
            't_c = v₀ / (μg(1 + m/M))',
            'v_c = m v₀ / (M + m)',
            'Δx = ½ v₀ t_c'
          ]
        }
      ]
    }
  ]
};
