import type { ControlsSchema } from '../../platform/controls-schema';
import { cyclotronConstants as C } from './scene.sim';

export const cyclotronControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '粒子',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'particle',
          columns: 3,
          presets: [
            { id: 'proton', label: '质子' },
            { id: 'deuteron', label: '氘核' },
            { id: 'alpha', label: 'α粒子' }
          ],
          initialActive: 'proton'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'B',
          label: '磁场 B',
          min: C.bMin,
          max: C.bMax,
          step: 1,
          value: C.bDefault,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'U',
          label: '电压 U',
          min: C.uMin,
          max: C.uMax,
          step: C.uStep,
          value: C.uDefault,
          unit: 'kV'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showField', label: '显示电场', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'T = 2πm / (qB)，与 U 无关',
            'Eₖₘ = q²B²R² / (2m)',
            '每次过缝 Eₖ 增加 qU；Eₖₘ 与 U 无关'
          ]
        }
      ]
    }
  ]
};
