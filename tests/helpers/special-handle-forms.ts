/**
 * 仍无法经 page.ts 字面量判定 silent-ready 的既有形态。
 * 独立非 spec 模块，避免 NO_EVENTFUL_PROJECTION 套件随跨 spec import 重复注册。
 *
 * A5 收窄为 id→理由映射：electrification 仍无 setValue（button-grid 动作），
 * 但已转发 setActiveSilently，scene-selector 走通用投影；委托工厂
 * （page.ts 不展开静默四件套）单独登记。
 */
export const EXISTING_SPECIAL_HANDLE_FORMS: Record<string, string> = {
  electrification:
    'handle 转发 setActiveSilently+fieldTypes；scene-selector 经通用投影回读 live scene；无 setValue（action 为 button-grid）。urlSyncKeys 仅 step（button-grid action），无 value-control 写回点',
  'single-loop':
    'page.ts 委托 src/pages/single-loop-integration.ts（该文件已 silent-ready）',
  'spring-oscillator':
    'imperative 列表重建；page.ts 委托 controls.ts 的 syncFromScene。相位预设卡是 custom DOM，正则扫不到 preset-group。k/m/A 在 imperative 卡片，page 无 writeParam 字面量（F3 豁免）'
};

export const EXISTING_SPECIAL_HANDLE_FORM_IDS = [
  'electrification',
  'single-loop',
  'spring-oscillator'
] as const;
