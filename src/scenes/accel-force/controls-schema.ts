import type { ControlsSchema } from '../../platform/controls-schema';
import { accelForceConstants as C } from './scene.sim';

export const accelForceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '控制变量',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'force', label: '保持 M（a—F）' },
            { id: 'inverseMass', label: '保持 F（a—1/M）' }
          ],
          initialActive: 'force'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'cartMass',
          label: '小车质量 M',
          min: C.cartMin,
          max: C.cartMax,
          step: 0.05,
          value: C.cartDefault,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'hangerMass',
          label: '槽码质量 m',
          min: C.hangerMin,
          max: C.hangerMax,
          step: 0.01,
          value: C.hangerDefault,
          unit: 'kg'
        },
        {
          type: 'toggle',
          key: 'balanced',
          label: '平衡摩擦力',
          value: true
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'release',
          label: '释放小车',
          variant: 'primary'
        },
        {
          type: 'button-grid',
          key: 'ops',
          columns: 2,
          buttons: [
            { key: 'resetCart', label: '复位小车' },
            { key: 'record', label: '记录数据点' },
            { key: 'clear', label: '清空记录' },
            { key: 'restart', label: '重新实验' }
          ]
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'a = mg/(M+m)，g = 9.8',
            '平衡后 F = Ma；未平衡 F − f = Ma',
            'Δs = a(Δt)²，Δt = 0.10 s',
            '未平衡时不得宣称正比'
          ]
        }
      ]
    }
  ]
};
