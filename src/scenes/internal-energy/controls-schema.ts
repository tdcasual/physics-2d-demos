import type { ControlsSchema } from '../../platform/controls-schema';
import { internalEnergyConstants } from './scene.sim';

export const internalEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'experiment',
          columns: 2,
          presets: [
            { id: 'compress', label: '压缩引火' },
            { id: 'expand', label: '膨胀白雾' },
            { id: 'heat', label: '热传递' },
            { id: 'law', label: '第一定律' }
          ],
          initialActive: 'compress'
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: false }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'compression',
          label: '活塞位移',
          min: internalEnergyConstants.compressionMin,
          max: internalEnergyConstants.compressionMax,
          step: 0.05,
          value: internalEnergyConstants.defaultCompression,
          unit: '×'
        },
        {
          type: 'slider',
          key: 'heatInput',
          label: '热交换量 Q',
          min: internalEnergyConstants.heatInputMin,
          max: internalEnergyConstants.heatInputMax,
          step: 5,
          value: internalEnergyConstants.defaultHeatInput,
          unit: 'J'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'button', key: 'quickCompress', label: '快速下压' },
        { type: 'button', key: 'slowCompress', label: '缓慢下压' },
        { type: 'button', key: 'reset', label: '复位', variant: 'danger' }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['ΔU = W + Q', 'W：做功，Q：热传递']
        }
      ]
    }
  ]
};
