export type ElectrificationScene = 'friction' | 'induction' | 'contact';

export type ElectrificationState = {
  scene: ElectrificationScene;
  stepIndex: number;
  explanation: string;
  nextActionLabel: string;
  leftCharge: number;
  rightCharge: number;
};

export type ElectrificationSnapshot = {
  state: ElectrificationState;
};

const SCENE_LABELS: Record<ElectrificationScene, string[]> = {
  friction: ['开始摩擦', '持续摩擦', '电荷转移完成'],
  induction: ['靠近带电体', '导体接地', '移除接地并远离'],
  contact: ['导体接触', '电荷重新分布']
};

const SCENE_EXPLANATIONS: Record<ElectrificationScene, string[]> = {
  friction: [
    '初始状态：丝绸和玻璃棒都接近电中性。',
    '摩擦过程中电子从玻璃棒转移到丝绸。',
    '分离后玻璃棒带正电，丝绸带负电。'
  ],
  induction: [
    '中性导体靠近带电体后发生电荷分离。',
    '接地释放同号电荷，异号电荷保留。',
    '移除接地和外部带电体后导体保持净电荷。'
  ],
  contact: ['两个导体接触前电荷不均。', '接触后电荷重新分配达到平衡。']
};

function chargeState(scene: ElectrificationScene, stepIndex: number): { left: number; right: number } {
  if (scene === 'friction') {
    if (stepIndex === 0) return { left: 0, right: 0 };
    if (stepIndex === 1) return { left: -2, right: 2 };
    return { left: -3, right: 3 };
  }

  if (scene === 'induction') {
    if (stepIndex === 0) return { left: -2, right: 2 };
    if (stepIndex === 1) return { left: -4, right: 1 };
    return { left: -3, right: 0 };
  }

  if (stepIndex === 0) return { left: 3, right: -1 };
  return { left: 1, right: 1 };
}

function clampStep(scene: ElectrificationScene, step: number): number {
  const max = SCENE_EXPLANATIONS[scene].length - 1;
  return Math.max(0, Math.min(max, step));
}

export function createElectrificationSim() {
  let scene: ElectrificationScene = 'friction';
  let stepIndex = 0;

  function buildState(): ElectrificationState {
    const charges = chargeState(scene, stepIndex);
    const actions = SCENE_LABELS[scene];
    const nextActionLabel = stepIndex < actions.length ? actions[stepIndex] : '无';
    return {
      scene,
      stepIndex,
      explanation: SCENE_EXPLANATIONS[scene][stepIndex],
      nextActionLabel,
      leftCharge: charges.left,
      rightCharge: charges.right
    };
  }

  return {
    getSnapshot(): ElectrificationSnapshot {
      return {
        state: buildState()
      };
    },
    setScene(nextScene: ElectrificationScene): void {
      scene = nextScene;
      stepIndex = 0;
    },
    runSceneAction(): void {
      stepIndex = clampStep(scene, stepIndex + 1);
    },
    reset(): void {
      scene = 'friction';
      stepIndex = 0;
    },
    step(dt: number): void {
      void dt;
    }
  };
}
