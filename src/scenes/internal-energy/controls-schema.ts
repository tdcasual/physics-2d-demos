import type { ControlsSchema } from '../../platform/controls-schema';
import { internalEnergyConstants as C } from './scene.sim';

export const internalEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          presets: [
            { id: 'compress', label: '压缩引火' },
            { id: 'expand', label: '膨胀白雾' },
            { id: 'heat', label: '热传递' }
          ],
          initialActive: 'compress'
        }
      ]
    },
    {
      title: '气体',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'ratio',
          label: '体积比 r',
          min: C.ratioMin,
          max: C.ratioMax,
          step: 0.1,
          value: C.defaultRatio
        },
        {
          type: 'slider',
          key: 'dewPoint',
          label: '露点',
          min: C.dewPointMin,
          max: C.dewPointMax,
          step: 1,
          value: C.defaultDewPoint,
          unit: '°C'
        },
        {
          type: 'toggle',
          key: 'wet',
          label: '湿空气',
          value: true
        }
      ]
    },
    {
      title: '热容',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'tHot',
          label: '初温 左块',
          min: C.tHotMin,
          max: C.tHotMax,
          step: 1,
          value: C.defaultTHot,
          unit: '°C'
        },
        {
          type: 'slider',
          key: 'tCold',
          label: '初温 右块',
          min: C.tColdMin,
          max: C.tColdMax,
          step: 1,
          value: C.defaultTCold,
          unit: '°C'
        },
        {
          type: 'slider',
          key: 'cHot',
          label: '热容 左块',
          min: C.cMin,
          max: C.cMax,
          step: 10,
          value: C.defaultCHot,
          unit: 'J/K'
        },
        {
          type: 'slider',
          key: 'cCold',
          label: '热容 右块',
          min: C.cMin,
          max: C.cMax,
          step: 10,
          value: C.defaultCCold,
          unit: 'J/K'
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
            '理想气体可逆绝热近似；快速过程 Q≈0',
            'ΔU = W + Q；W 为外界对系统做功（正），Q 为系统吸热（正）',
            '压缩 W>0、ΔU>0；膨胀 W<0、ΔU<0',
            '湿空气且 T<露点才凝结；180°C 仅为封面示意',
            '热传递：W=0，Q左+Q右=0，Teq=(C左T左+C右T右)/(C左+C右)'
          ]
        }
      ]
    }
  ]
};
