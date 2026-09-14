import type { ControlsSchema } from '../../platform/controls-schema';
import { laserSpeedConstants } from './scene.sim';

export const laserSpeedControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数设置',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'velocity',
          label: '车速 v',
          min: laserSpeedConstants.minVelocity,
          max: laserSpeedConstants.maxVelocity,
          step: 1,
          value: 20,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'interval',
          label: '发射间隔 ΔT',
          min: laserSpeedConstants.minInterval,
          max: laserSpeedConstants.maxInterval,
          step: 0.1,
          value: 1,
          unit: 's',
          formatValue: (value) => value.toFixed(1)
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '观察',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showPulses', label: '显示光脉冲', value: true },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示运动箭头',
          value: true
        },
        {
          type: 'button',
          key: 'reset',
          label: '复位重置',
          variant: 'secondary'
        }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['tᵢ = Δtᵢ / 2', 'xᵢ = c·Δtᵢ / 2', 'v = Δx / Δt']
        }
      ]
    }
  ]
};
