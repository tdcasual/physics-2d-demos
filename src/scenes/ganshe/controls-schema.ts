import type { ControlsSchema } from '../../platform/controls-schema';

export const gansheControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '场景模式',
      collapsed: false,
      fields: [
        {
          type: 'scene-selector',
          key: 'mode',
          scenes: [
            { id: 'head-on', label: '双源对撞', desc: '两波相向传播' },
            { id: 'single', label: '单向传播', desc: '两波同向传播' }
          ],
          initialActive: 'head-on'
        }
      ]
    },
    {
      title: '干涉预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 3,
          presets: [
            { id: 'constructive', label: '相长', desc: 'Δφ=0°' },
            { id: 'destructive', label: '相消', desc: 'Δφ=180°' },
            { id: 'beat', label: '拍频', desc: 'f₁≠f₂' },
            { id: 'standing', label: '驻波', desc: '对撞同频' },
            { id: 'pulse', label: '脉冲', desc: '波包叠加' }
          ]
        }
      ]
    }
  ]
};
