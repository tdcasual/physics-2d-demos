import type { ControlsSchema } from '../../platform/controls-schema';
import { faradayConstants as C } from './scene.sim';

export const faradayControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '教学预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 3,
          presets: [
            { id: 'standard', label: '标准顺转 ⊗' },
            { id: 'reverse-field', label: '反向磁场 ⊙' },
            { id: 'open-circuit', label: '开路对照' }
          ],
          initialActive: 'standard'
        }
      ]
    },
    {
      title: '方向',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'rotation',
          columns: 2,
          presets: [
            { id: 'cw', label: '顺时针' },
            { id: 'ccw', label: '逆时针' }
          ],
          initialActive: 'cw'
        },
        {
          type: 'preset-group',
          key: 'field',
          columns: 2,
          presets: [
            { id: 'into', label: 'B 向里 ⊗' },
            { id: 'out', label: 'B 向外 ⊙' }
          ],
          initialActive: 'into'
        }
      ]
    },
    {
      title: '电路',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'closed', label: '闭合回路', value: true }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'B',
          label: '磁感应强度 B',
          min: C.bMin,
          max: C.bMax,
          step: 0.2,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'omega',
          label: '角速度 ω',
          min: C.omegaMin,
          max: C.omegaMax,
          step: 1,
          value: 10,
          unit: 'rad/s'
        },
        {
          type: 'slider',
          key: 'radius',
          label: '圆盘半径 R',
          min: C.radiusMin,
          max: C.radiusMax,
          step: 0.05,
          value: 0.2,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'externalResistance',
          label: '外接电阻',
          min: C.resistanceMin,
          max: C.resistanceMax,
          step: 0.5,
          value: 2,
          unit: 'Ω'
        }
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
            'E = ½ B ω R²',
            '断路 I = 0，灯泡熄灭',
            '闭路 I = E / R外，P电 = I E = M安 ω'
          ]
        }
      ]
    }
  ]
};
