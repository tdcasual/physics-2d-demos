import type { ControlsSchema } from '../../platform/controls-schema';
import { verticalCircleConstants as C } from './scene.sim';

export const verticalCircleControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          presets: [
            { id: 'rope', label: '绳模型（只能拉）' },
            { id: 'rod', label: '杆模型（拉与推）' }
          ],
          initialActive: 'rope'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'vBottom',
          label: 'v_bottom',
          min: C.vBottomMin,
          max: C.vBottomMax,
          step: 0.5,
          value: C.vBottomDefault,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'theta',
          label: 'θ',
          min: -180,
          max: 180,
          step: 1,
          value: C.thetaDefault,
          unit: '°'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示受力', value: true },
        { type: 'toggle', key: 'showPath', label: '显示轨道', value: true }
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
            '绳模型（只能拉）  v顶 ≥ √gR',
            '杆模型（拉与推）  v顶可为 0',
            'v² = v₀² − 2gR(1 + cosθ)',
            'T = mv²/R − mg cosθ'
          ]
        }
      ]
    }
  ]
};
