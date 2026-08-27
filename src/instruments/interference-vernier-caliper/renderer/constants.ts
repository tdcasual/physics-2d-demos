/**
 * 干涉读数游标卡尺 — 物理与像素常量
 */

export const UNIT_PX = 96; // 1 cm = 96 px
export const MAIN_SUB_TICK_PX = 9.6; // 0.1 cm = 9.6 px
export const VERNIER_DIVISIONS = 50; // 50 分度游标
const VERNIER_LENGTH_UNITS = 4.9; // 游标尺总长 4.9 cm
export const VERNIER_LENGTH_PX = VERNIER_LENGTH_UNITS * UNIT_PX; // 470.4 px
export const VERNIER_SUB_TICK_PX = VERNIER_LENGTH_PX / VERNIER_DIVISIONS; // 9.408 px
export const LEAST_COUNT_PX = 0.192; // 最小移动像素步长
export const MAX_CM = 2.1; // 量程上限 2.1 cm
export const MAX_X = MAX_CM * UNIT_PX; // 201.6 px
const PATTERN_CENTER_CM = 1.5; // 干涉图样中心固定位置
export const PATTERN_ABSOLUTE_X = PATTERN_CENTER_CM * UNIT_PX; // 144 px
export const LENS_OFFSET_FROM_VERNIER = 235; // 视场中心相对游标 0 刻度
export const LENS_VISUAL_SCALE = 1.2; // 目镜内容视觉放大系数
