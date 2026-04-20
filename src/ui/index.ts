// UI 组件导出
export {
  createControlLayout,
  type ControlLayoutManager
} from './control-layout';
export { createControlCard, type ControlCardOptions } from './control-layout';
export {
  createFloatingControls,
  type FloatingControls,
  type FloatingControlsOptions
} from './floating-controls';

// 新版共享控制组件（推荐新场景使用）
export {
  createSceneControls,
  createSliderRow,
  createSelectRow,
  createButtonGrid,
  createPresetButtonGroup,
  createTransportRow,
  createSceneSelector,
  createDeleteButton,
  type ControlItem,
  type SceneControlsOptions,
  type SceneControlsInstance
} from './components/SceneControls';
