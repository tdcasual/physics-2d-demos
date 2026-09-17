import type { ControlsSchema } from '../../platform/controls-schema';
import { projectileComponentsConstants } from './scene.sim';

export const projectileComponentsControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: '初速度 v₀',
          min: projectileComponentsConstants.speedMin,
          max: projectileComponentsConstants.speedMax,
          step: 0.5,
          value: projectileComponentsConstants.defaultSpeed,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'initialHeight',
          label: '初始高度 h₀',
          min: projectileComponentsConstants.heightMin,
          max: projectileComponentsConstants.heightMax,
          step: 1,
          value: projectileComponentsConstants.defaultInitialHeight,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: projectileComponentsConstants.gravityMin,
          max: projectileComponentsConstants.gravityMax,
          step: 0.1,
          value: projectileComponentsConstants.defaultGravity,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'samplePeriod',
          label: '采样间隔 Δt',
          min: projectileComponentsConstants.samplePeriodMin,
          max: projectileComponentsConstants.samplePeriodMax,
          step: 0.05,
          value: projectileComponentsConstants.defaultSamplePeriod,
          unit: 's'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showTrajectory',
          label: '抛物线轨迹',
          value: true
        },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '速度分解',
          value: true
        },
        {
          type: 'toggle',
          key: 'showShadows',
          label: '分运动影子球',
          value: true
        },
        {
          type: 'toggle',
          key: 'showStrobe',
          label: '频闪采样',
          value: true
        }
      ]
    }
  ]
};
