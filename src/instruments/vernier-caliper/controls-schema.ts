import type { ControlsSchema } from '../../platform/controls-schema';

export const vernierCaliperControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '测量设置',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'select',
          key: 'precision',
          label: '精度',
          value: '0.02',
          options: [
            { label: '0.02 mm（50 分度）', value: '0.02' },
            { label: '0.05 mm（20 分度）', value: '0.05' },
            { label: '0.1 mm（10 分度）', value: '0.1' }
          ]
        },
        {
          type: 'select',
          key: 'objectType',
          label: '被测物',
          value: '0',
          options: [
            { label: '小球直径', value: '0' },
            { label: '金属块长度', value: '1' },
            { label: '管内径', value: '2' }
          ]
        }
      ]
    },
    {
      title: '读数方法（人教版）',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'custom',
          key: 'hint',
          label: '',
          render(mount: HTMLElement) {
            mount.className = 'text-sm text-[#555]';
            mount.innerHTML =
              '<p>• 主尺读数：游标零线左侧的整毫米数</p>' +
              '<p>• 游标读数：与主尺某刻度对齐的游标格数 × 精度</p>' +
              '<p>• 测量值 = 主尺读数 + 游标读数（不需估读）</p>';
          }
        }
      ]
    }
  ]
};
