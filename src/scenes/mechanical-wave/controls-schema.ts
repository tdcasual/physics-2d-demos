/**
 * 机械波 — 控制面板 Schema
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const mechanicalWaveControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '波参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'waveSpeed',
          label: '波速 v',
          min: 0.5,
          max: 10,
          step: 0.1,
          value: 2,
          unit: 'm/s',
        },
        {
          type: 'slider',
          key: 'wavelength',
          label: '波长 λ',
          min: 1,
          max: 10,
          step: 0.1,
          value: 4,
          unit: 'm',
        },
        {
          type: 'slider',
          key: 'period',
          label: '周期 T',
          min: 0.5,
          max: 8,
          step: 0.1,
          value: 2,
          unit: 's',
        },
      ],
    },
    {
      title: '振幅',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'amplitude',
          label: '振幅 A',
          min: 1,
          max: 10,
          step: 0.5,
          value: 5,
          unit: 'cm',
        },
      ],
    },
    {
      title: '方向',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'direction',
          columns: 2,
          presets: [
            { id: 'right', label: '向右传播' },
            { id: 'left', label: '向左传播' },
          ],
          initialActive: 'right',
        },
      ],
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showMicroShift',
          label: '微移对比',
          value: true,
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
  ],
};
