import type { ControlsSchema } from '../../platform/controls-schema';
import { wireLoopFieldConstants as C } from './scene.sim';

export const wireLoopFieldControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '线圈形状',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'shape',
          columns: 2,
          initialActive: 'rectangle',
          presets: [
            { id: 'rectangle', label: '矩形线圈' },
            { id: 'triangle', label: '三角线圈' },
            { id: 'circle', label: '圆形线圈' },
            { id: 'semicircle', label: '半圆线圈' }
          ]
        }
      ]
    },
    {
      title: '物理参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'fieldStrength',
          label: '磁感应强度 B',
          min: C.fieldMin,
          max: C.fieldMax,
          step: 0.1,
          value: C.defaultField,
          unit: 'T'
        },
        {
          type: 'preset-group',
          key: 'fieldDirection',
          columns: 2,
          initialActive: 'into',
          presets: [
            { id: 'into', label: '向里（⊗）' },
            { id: 'out', label: '向外（⊙）' }
          ]
        },
        {
          type: 'slider',
          key: 'velocity',
          label: '线圈速度 v',
          min: C.velocityMin,
          max: C.velocityMax,
          step: 0.1,
          value: C.defaultVelocity,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '总电阻 R',
          min: C.resistanceMin,
          max: C.resistanceMax,
          step: 0.1,
          value: C.defaultResistance,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'toggle',
          key: 'showCurrent',
          label: '显示感应电流',
          value: true
        },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Φ = B · S', 'E = B · L等效 · v', 'I = E / R']
        }
      ]
    }
  ]
};
