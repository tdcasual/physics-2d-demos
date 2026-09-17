import type { ControlsSchema } from '../../platform/controls-schema';
import { variableWorkConstants } from './scene.sim';

export const variableWorkControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '物理模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          presets: [
            { id: 'linear', label: '线性力 F=kx' },
            { id: 'power', label: '恒功率加速' },
            { id: 'piecewise', label: '分段渐减力' }
          ],
          initialActive: 'linear'
        }
      ]
    },
    {
      title: '模型参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: '滑块质量 m',
          min: variableWorkConstants.massMin,
          max: variableWorkConstants.massMax,
          step: 0.5,
          value: variableWorkConstants.defaultMass,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'k',
          label: '比例系数 k',
          min: variableWorkConstants.kMin,
          max: variableWorkConstants.kMax,
          step: 0.5,
          value: variableWorkConstants.defaultK,
          unit: 'N/m'
        },
        {
          type: 'slider',
          key: 'power',
          label: '恒定功率 P₀',
          min: variableWorkConstants.powerMin,
          max: variableWorkConstants.powerMax,
          step: 1,
          value: variableWorkConstants.defaultPower,
          unit: 'W'
        },
        {
          type: 'slider',
          key: 'microsteps',
          label: '微元 n',
          min: variableWorkConstants.microstepsMin,
          max: variableWorkConstants.microstepsMax,
          step: 1,
          value: variableWorkConstants.defaultMicrosteps
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'W = ∫ F dx = 图象面积',
            'P = Fv，W = ∫ P dt',
            '动能定理 ΔEₖ = W',
            '微元为左端点矩形（F=kx 低估）',
            '恒功率从 v₀=1 m/s 起步，W=P₀t',
            '舞台 F、v 为趋势示意'
          ]
        }
      ]
    }
  ]
};
