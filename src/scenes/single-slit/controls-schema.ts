import type { ControlsSchema } from '../../platform/controls-schema';

export const singleSlitControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'lambda',
          label: '波长 λ',
          min: 400,
          max: 700,
          step: 1,
          value: 670,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'slitWidth',
          label: '狭缝宽度 a',
          min: 0.08,
          max: 0.6,
          step: 0.01,
          value: 0.22,
          unit: 'mm'
        },
        {
          type: 'slider',
          key: 'distance',
          label: '缝屏距离 L',
          min: 0.8,
          max: 4,
          step: 0.1,
          value: 2.4,
          unit: 'm'
        }
      ]
    },
    {
      title: '探测器',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'detectorX',
          label: '位置 x',
          min: -32,
          max: 32,
          step: 0.1,
          value: 7.31,
          unit: 'mm'
        },
        { type: 'toggle', key: 'autoScan', label: '自动扫描', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['I/I₀ = (sinβ/β)²', 'x₁ = λL/a', 'Δx ≈ 2λL/a']
        }
      ]
    }
  ]
};
