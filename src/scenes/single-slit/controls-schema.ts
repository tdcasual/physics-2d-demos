import type { ControlsSchema } from '../../platform/controls-schema';
import { singleSlitConstants as C } from './scene.sim';

export const singleSlitControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'lambda',
          label: '波长 λ',
          min: C.lambdaMin,
          max: C.lambdaMax,
          step: 1,
          value: C.lambdaDefault,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'slitWidth',
          label: '缝宽 a',
          min: C.slitMin,
          max: C.slitMax,
          step: 0.01,
          value: C.slitDefault,
          unit: 'mm'
        },
        {
          type: 'slider',
          key: 'distance',
          label: '缝屏距 L',
          min: C.distanceMin,
          max: C.distanceMax,
          step: 0.1,
          value: C.distanceDefault,
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
          min: C.detectorMin,
          max: C.detectorMax,
          step: 0.1,
          value: C.detectorDefault,
          unit: 'mm'
        },
        { type: 'toggle', key: 'autoScan', label: '自动扫描', value: true }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['I/I₀ = (sinβ/β)²', 'x₁ ≈ λL/a', 'Δx ≈ 2λL/a']
        }
      ]
    }
  ]
};
