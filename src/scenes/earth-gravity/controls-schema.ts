import type { ControlsSchema } from '../../platform/controls-schema';
import { earthGravityConstants } from './scene.sim';

export const earthGravityControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数设置',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'latitude',
          label: '所在纬度 θ',
          min: earthGravityConstants.minLatitude,
          max: earthGravityConstants.maxLatitude,
          step: 0.1,
          value: earthGravityConstants.defaultLatitude,
          unit: '°',
          formatValue: (value) => value.toFixed(1)
        },
        {
          type: 'slider',
          key: 'mass',
          label: '质点质量 m',
          min: earthGravityConstants.minMass,
          max: earthGravityConstants.maxMass,
          step: 0.5,
          value: earthGravityConstants.defaultMass,
          unit: 'kg'
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '观察图层',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示三力矢量',
          value: true
        },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '显示分解关系',
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
      title: '核心公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['F万 = GMm / R²', 'F向 = mω²r', 'F万 = G + F向']
        }
      ]
    }
  ]
};
