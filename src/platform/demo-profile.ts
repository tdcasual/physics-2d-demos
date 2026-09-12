/**
 * 演示配置系统 — 平台层共享契约
 *
 * 场景声明上课任务与键名；布局 capability 决定几何；
 * 场景 view 用 renderHints 放大现象。
 */

/** 控制面板策略 */
export type DemoControlStrategy = 'hidden' | 'collapsed' | 'minimal' | 'full';

/** 读数面板策略 */
export type DemoReadoutStrategy =
  | 'hidden'
  | 'overlay'
  | 'docked-top'
  | 'docked-bottom';

/** 图表区策略 */
export type DemoGraphStrategy = 'hidden' | 'collapsed' | 'visible';

/** 运输条策略（undefined = 不改已挂载节点） */
export type DemoTransportStrategy = 'hidden' | 'visible';

/** 上课任务母版 */
export type LessonTask = 'lecture' | 'derivation' | 'instrument' | 'process';

/** 渲染提示（传给场景 view） */
export interface DemoRenderHints {
  contentScale: number;
  fontScale?: number;
  strokeScale?: number;
  markerScale?: number;
  /** C 类唯一揭示开关。默认 false。 */
  revealAnswer?: boolean;
  custom?: Record<string, unknown>;
}

/** 交互提示 */
export interface DemoInteractionHints {
  touchTargetMinSize?: number;
  visibleControlKeys?: string[];
}

/** 场景演示配置（场景作者编写） */
export interface SceneDemoProfile {
  lessonTask?: LessonTask;
  /** 有 lessonTask 时省略 = 用母版；无 lessonTask 时被 UNMIGRATED 表忽略 */
  controlPanel?: DemoControlStrategy;
  readoutPanel?: DemoReadoutStrategy;
  graphPanel?: DemoGraphStrategy;
  transport?: DemoTransportStrategy;
  readoutKeys?: string[];
  renderHints: DemoRenderHints;
  interactionHints?: DemoInteractionHints;
}

export interface ResolveDemoProfileContext {
  sceneId: string;
}

export interface ResolvedDemoProfile {
  lessonTask: LessonTask | 'unmigrated';
  controlPanel: DemoControlStrategy;
  readoutPanel: DemoReadoutStrategy;
  graphPanel?: DemoGraphStrategy;
  transport?: DemoTransportStrategy;
  readoutKeys: string[];
  visibleControlKeys: string[];
  renderHints: DemoRenderHints;
  touchTargetMinSize: number;
}

export const TASK_MASTERS: Record<
  LessonTask,
  {
    controlPanel: DemoControlStrategy;
    readoutPanel: DemoReadoutStrategy;
    graphPanel?: DemoGraphStrategy;
    transport: DemoTransportStrategy;
  }
> = {
  lecture: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: 'hidden',
    transport: 'visible'
  },
  derivation: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: 'visible',
    transport: 'hidden'
  },
  instrument: {
    controlPanel: 'minimal',
    readoutPanel: 'hidden',
    transport: 'hidden'
  },
  process: {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: 'visible',
    transport: 'visible'
  }
};

/** 未迁移窗口冻结表。改一行必须附单测。 */
export const UNMIGRATED: Record<
  string,
  Pick<
    ResolvedDemoProfile,
    'controlPanel' | 'readoutPanel' | 'graphPanel' | 'transport'
  >
> = {
  projectile: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'mechanical-wave': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'field-lines': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'doppler-effect': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'vt-integral': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'double-slit': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'interference-formula': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: 'visible',
    transport: undefined
  },
  'thin-film': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: 'visible',
    transport: undefined
  },
  wedge: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: 'visible',
    transport: undefined
  },
  'vernier-caliper': {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  micrometer: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  ganshe: {
    controlPanel: 'minimal',
    readoutPanel: 'overlay',
    graphPanel: undefined,
    transport: undefined
  },
  'chase-meet': {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: 'visible',
    transport: undefined
  },
  'tortoise-hare': {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: undefined,
    transport: undefined
  },
  'xt-graph': {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: undefined,
    transport: undefined
  },
  electrification: {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: undefined,
    transport: undefined
  },
  'emf-analogy': {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    graphPanel: undefined,
    transport: undefined
  },
  'spring-oscillator': {
    controlPanel: 'hidden',
    readoutPanel: 'hidden',
    graphPanel: 'visible',
    transport: undefined
  },
  'ticker-tape': {
    controlPanel: 'minimal',
    readoutPanel: 'docked-bottom',
    graphPanel: undefined,
    transport: undefined
  }
};

export function resolveDemoProfile(
  input: SceneDemoProfile,
  ctx: ResolveDemoProfileContext
): ResolvedDemoProfile {
  const hints: DemoRenderHints = {
    contentScale: input.renderHints.contentScale,
    fontScale: input.renderHints.fontScale,
    strokeScale: input.renderHints.strokeScale,
    markerScale: input.renderHints.markerScale,
    revealAnswer: input.renderHints.revealAnswer ?? false,
    custom: input.renderHints.custom
  };
  const keys = {
    readoutKeys: input.readoutKeys ?? [],
    visibleControlKeys: input.interactionHints?.visibleControlKeys ?? [],
    touchTargetMinSize: input.interactionHints?.touchTargetMinSize ?? 48,
    renderHints: hints
  };

  if (!input.lessonTask) {
    const row = UNMIGRATED[ctx.sceneId];
    if (!row) {
      console.warn(
        `[demo-profile] unknown unmigrated scene "${ctx.sceneId}"; using raw control/readout`
      );
      return {
        lessonTask: 'unmigrated',
        controlPanel: input.controlPanel ?? 'minimal',
        readoutPanel: input.readoutPanel ?? 'overlay',
        graphPanel: input.graphPanel,
        transport: input.transport,
        ...keys
      };
    }
    return { lessonTask: 'unmigrated', ...row, ...keys };
  }

  const master = TASK_MASTERS[input.lessonTask];
  return {
    lessonTask: input.lessonTask,
    controlPanel: input.controlPanel ?? master.controlPanel,
    readoutPanel: input.readoutPanel ?? master.readoutPanel,
    graphPanel: input.graphPanel ?? master.graphPanel,
    transport: input.transport ?? master.transport,
    ...keys
  };
}

export const DESKTOP_DEMO_LAYOUTS = [
  'split-right',
  'split-right-graph-bottom',
  'lab-stage'
] as const;

export function isDesktopDemoLayout(layoutId: string): boolean {
  return (DESKTOP_DEMO_LAYOUTS as readonly string[]).includes(layoutId);
}
