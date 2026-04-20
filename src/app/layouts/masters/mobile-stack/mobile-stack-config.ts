import type { LayoutConfig } from '../../types';

export interface SectionTitles {
  graph?: string;
  control?: string;
  readout?: string;
}

export interface ControlButtonConfig {
  showPlayPause?: boolean;
  showReset?: boolean;
  showSpeed?: boolean;
  showFullscreen?: boolean;
  speedMin?: number;
  speedMax?: number;
  speedStep?: number;
}

export interface GestureConfig {
  enabled?: boolean;
  swipeToToggleGraph?: boolean;
  edgeSwipeToGoBack?: boolean;
  doubleTapToReset?: boolean;
  longPressForMenu?: boolean;
  excludeCanvas?: boolean;
}

export interface PerformanceConfig {
  enableVirtualScroll?: boolean;
  scrollThrottleMs?: number;
  resizeDebounceMs?: number;
  useRAF?: boolean;
  lazyLoadSections?: boolean;
}

export interface MobileStackConfig extends LayoutConfig {
  animationHeightVh?: number;
  animationMinHeight?: number;
  animationMaxHeight?: number;
  graphExpanded?: boolean;
  graphHeight?: number;
  stickyControls?: boolean;
  sectionTitles?: SectionTitles;
  controls?: ControlButtonConfig;
  maxReadoutItems?: number;
  persistState?: boolean;
  stateKey?: string;
  gestures?: GestureConfig;
  performance?: PerformanceConfig;
  themeFollowSystem?: boolean;
  themeTransitionDuration?: number;
  enableDebugPanel?: boolean;
  enablePerfMonitor?: boolean;
}

export const DEFAULT_CONFIG: Required<MobileStackConfig> = {
  animationHeightVh: 50,
  animationMinHeight: 250,
  animationMaxHeight: 500,
  graphExpanded: false,
  graphHeight: 200,
  stickyControls: true,
  sectionTitles: { graph: '📈 数据图表', control: '⚙️ 控制区', readout: '' },
  controls: {
    showPlayPause: true,
    showReset: true,
    showSpeed: true,
    showFullscreen: false,
    speedMin: 0.05,
    speedMax: 3,
    speedStep: 0.05
  },
  maxReadoutItems: 6,
  persistState: false,
  stateKey: 'mobile-stack-state',
  gestures: {
    enabled: true,
    swipeToToggleGraph: true,
    edgeSwipeToGoBack: false,
    doubleTapToReset: true,
    longPressForMenu: false,
    excludeCanvas: true
  },
  performance: {
    enableVirtualScroll: false,
    scrollThrottleMs: 16,
    resizeDebounceMs: 100,
    useRAF: true,
    lazyLoadSections: false
  },
  themeFollowSystem: true,
  themeTransitionDuration: 300,
  enableDebugPanel: false,
  enablePerfMonitor: false,
  theme: 'light',
  slots: {},
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
  __managedByContainer: false
};
