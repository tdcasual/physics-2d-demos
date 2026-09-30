/**
 * 1000×500 逻辑画布几何与离屏缓存像素。
 *
 * 主渲染已 `ctx.setTransform(scale * dpr)`（scale = min(rawScale, fitScale)），
 * 下列值为逻辑单位 / 缓存像素，禁止再乘 scale，否则双重缩放。
 */

export const TUBE_HALF = 100;
export const TUBE_FULL = 200;
export const WAVE_REACH_SHORT = 60;
export const SLIT_BOARD_HALF = 80;
export const SINGLE_SLIT_ARM = 78;
export const SCREEN_HALF = 120;
export const SCREEN_FULL = 240;
export const STEP5_IMAGE_HALF = 125;
export const DELTA_X_LABEL_SHIFT = 120;
export const GLOW_CACHE_PX = 60;
export const WHITE_FRINGE_CACHE_X = 382;
export const WHITE_FRINGE_CACHE_Y = 155;
