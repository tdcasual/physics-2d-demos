/**
 * 多普勒效应 — 控制面板 Schema
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const dopplerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '波源',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'sourceSpeed',
          label: '波源速度',
          min: -5,
          max: 5,
          step: 0.1,
          value: 0,
          unit: 'm/s',
        },
        {
          type: 'slider',
          key: 'emitFrequency',
          label: '发射频率',
          min: 1,
          max: 10,
          step: 0.5,
          value: 3,
          unit: 'Hz',
        },
      ],
    },
    {
      title: '观察者',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'observerSpeed',
          label: '观察者速度',
          min: -5,
          max: 5,
          step: 0.1,
          value: 0,
          unit: 'm/s',
        },
      ],
    },
    {
      title: '模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          presets: [
            { id: 'source-moving', label: '波源运动' },
            { id: 'observer-moving', label: '观察者运动' },
            { id: 'both-moving', label: '双方运动' },
          ],
          initialActive: 'source-moving',
        },
      ],
    },
    {
      title: '预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          presets: [
            { id: 'static', label: '静止' },
            { id: 'approach', label: '接近' },
            { id: 'recede', label: '远离' },
            { id: 'low-freq', label: '低频' },
          ],
        },
      ],
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'playbackSpeed',
          label: '播放速度',
          min: 0.1,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'x',
        },
      ],
    },
    {
      title: '音频',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'audioEnabled',
          label: '开启音频',
          value: false,
        },
        {
          type: 'slider',
          key: 'audioVolume',
          label: '音量',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
          unit: '%',
        },
      ],
    },
  ],
};
