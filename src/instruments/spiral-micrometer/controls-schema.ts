import type { ControlsSchema } from '../../platform/controls-schema';

export const spiralMicrometerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '读数设置',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'reading',
          label: '当前读数',
          min: 0,
          max: 25,
          step: 0.001,
          value: 6.725,
          unit: 'mm'
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
              '<p>• 先读固定刻度：露出的整毫米数，并看半毫米线是否露出（0.5mm 一格）</p>' +
              '<p>• 再读微分筒：与水平基准线对齐的分度 × 0.01mm</p>' +
              '<p>• 末位估读一位，故精确到 0.001mm</p>' +
              '<p>• 读数 = 固定刻度 + 微分筒读数 × 0.01mm</p>';
          }
        }
      ]
    }
  ]
};
