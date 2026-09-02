/**
 * 游标卡尺使用演示 — 声明式控制面板
 *
 * 供场景嵌入时经 renderSchema 使用。仪器库审计页（instruments.html）
 * 目前从 meta.defaultParams 自动生成通用参数编辑器，不消费本 schema；
 * 保留它是为了场景嵌入时即有规范面板可用。
 */

import type { ControlsSchema } from '../../platform/controls-schema';
import { JAW_MAX } from './instrument.sim';

export const vernierCaliperGuideControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '测量设置',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'select',
          key: 'mode',
          label: '测量方式',
          value: '0',
          options: [
            { label: '外径（外测量爪）', value: '0' },
            { label: '内径（内测量爪）', value: '1' },
            { label: '深度（深度尺）', value: '2' }
          ]
        },
        {
          type: 'select',
          key: 'precision',
          label: '精度',
          value: '0.1',
          options: [
            { label: '0.1 mm（10 分度）', value: '0.1' },
            { label: '0.05 mm（20 分度）', value: '0.05' },
            { label: '0.02 mm（50 分度）', value: '0.02' }
          ]
        },
        {
          type: 'slider',
          key: 'jawPosition',
          label: '卡爪位置',
          min: 0,
          max: JAW_MAX,
          step: 0.02,
          value: 23.7,
          unit: 'mm'
        },
        {
          type: 'toggle',
          key: 'showReading',
          label: '显示读数（关闭即练习模式）',
          value: true
        },
        {
          type: 'toggle',
          key: 'demo',
          label: '自动演示使用步骤',
          value: false
        }
      ]
    },
    {
      title: '读数方法（人教版）',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'hint',
          key: 'hint',
          lines: [
            '• 主尺读数：游标零线左侧的整毫米数',
            '• 游标读数：与主尺某刻度对齐的游标格数 × 精度',
            '• 测量值 = 主尺读数 + 游标读数（不需估读）',
            '• 三种方式共用同一读数法：外爪量外径、内爪量内径、深度尺量深度'
          ]
        }
      ]
    }
  ]
};
