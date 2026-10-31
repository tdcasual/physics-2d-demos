/**
 * 兼容再导出。实现已下沉 platform/control-projection.ts，
 * 供 ui（绑定式 reset）与 app（引导器 remount）共用。
 */

export {
  collectFieldKeys,
  paramsFromScene,
  projectControlsFromParams,
  resetSceneAndControls,
  syncControlsFromLiveParams,
  type ControlProjectionHandle,
  type ControlProjectionParamSync,
  type ProjectControlsFromParamsOptions
} from '../platform/control-projection';
