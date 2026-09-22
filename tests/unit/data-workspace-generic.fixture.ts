import {
  addSessionTrial,
  applyFieldDrafts,
  cloneSession,
  createEmptySession,
  freezeSession,
  formatResultText,
  isFieldReady,
  removeSessionTrial,
  writeCheckedField,
  type DataWorkspaceDraft,
  type DataWorkspaceHost,
  type DataWorkspaceSpec
} from '../../src/platform/data-workspace';

/** Unrelated ids: proves the panel/session stack is not double-slit specific. */
export const kinematicsWorkspaceSpec: DataWorkspaceSpec = {
  id: 'kinematics-mean-speed',
  title: '测平均速率',
  chartAnalysis: false,
  enabledSteps: ['data', 'calculation'],
  trialCount: 4,
  minRows: 1,
  maxRows: 4,
  initialRows: 1,
  rowFields: [
    { id: 'mass', label: '质量', unit: 'kg', inputMode: 'decimal' },
    { id: 'time', label: '时间', unit: 's', inputMode: 'decimal' },
    {
      id: 'speed',
      label: '速率',
      unit: 'm/s',
      inputMode: 'decimal',
      gated: true,
      readinessHint: '请先校对质量和时间',
      dependsOn: [
        { scope: 'row', field: 'mass' },
        { scope: 'row', field: 'time' }
      ]
    }
  ],
  summaryFields: [
    {
      id: 'meanSpeed',
      label: '平均速率',
      unit: 'm/s',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'all-rows', field: 'speed' }],
      readinessHint: '请先完成当前 {rowCount} 组速率校对',
      readinessHintOne: '请先完成本组速率校对'
    }
  ],
  result: {
    field: 'meanSpeed',
    template: '平均速率 = {value} {unit}',
    digits: 2
  },
  completionField: 'meanSpeed'
};

/** Two-step + transposed + fixed rows. No scene-specific copy. */
export const kinematicsChartWorkspaceSpec: DataWorkspaceSpec = {
  id: 'kinematics-chart',
  title: '测平均速率',
  chartAnalysis: true,
  enabledSteps: ['data', 'calculation', 'chartAnalysis'],
  trialCount: 3,
  minRows: 3,
  maxRows: 3,
  initialRows: 3,
  stageMode: 'full',
  tableOrientation: 'fields',
  stageLock: true,
  rowFields: kinematicsWorkspaceSpec.rowFields,
  summaryFields: [
    ...kinematicsWorkspaceSpec.summaryFields,
    {
      id: 'fitSlope',
      label: '图线斜率',
      unit: 'm/s²',
      inputMode: 'decimal',
      gated: true,
      step: 'chartAnalysis',
      dependsOn: [{ scope: 'summary', field: 'meanSpeed' }],
      readinessHint: '请先完成数据处理后再校对'
    }
  ],
  result: {
    field: 'fitSlope',
    template: '图线斜率 = {value} {unit}',
    digits: 2
  },
  completionField: 'fitSlope'
};

export function createSpecHost(
  spec: DataWorkspaceSpec,
  options?: {
    naCells?: ReadonlyArray<{ trialIndex: number; field: string }>;
  }
): {
  host: DataWorkspaceHost;
  getLiveSession: () => ReturnType<typeof createEmptySession>;
} {
  const naCells = options?.naCells ?? [];
  const naState = {
    raw: '—',
    value: Number.NaN,
    checked: true as const,
    stale: false,
    feedback: { ok: true, message: '无需填写' }
  };
  const restoreNa = (
    current: ReturnType<typeof createEmptySession>
  ): ReturnType<typeof createEmptySession> => {
    if (naCells.length === 0) return current;
    const next = cloneSession(current);
    for (const cell of naCells) {
      const trial = next.trials[cell.trialIndex];
      if (!trial) continue;
      trial.fields[cell.field] = { ...naState };
    }
    return next;
  };
  let session = restoreNa(createEmptySession(spec));
  const host: DataWorkspaceHost = {
    getSpec: () => spec,
    getEligibility: () => ({ ok: true }),
    getSession: () => freezeSession(cloneSession(session)),
    getKnowns: () => [{ key: 'g', label: 'g', value: '9.8 m/s²' }],
    getHint: () => '填写质量、时间和速率',
    setActive(active: boolean) {
      session = { ...session, active };
    },
    submitField(input) {
      const value = Number(input.raw);
      session = restoreNa(
        writeCheckedField(
          session,
          input.trialIndex,
          input.field,
          {
            raw: input.raw,
            value,
            checked: Number.isFinite(value),
            stale: false,
            feedback: Number.isFinite(value)
              ? { ok: true, message: 'ok' }
              : { ok: false, layer: 'format', message: '无效' }
          },
          spec
        )
      );
      return { feedback: { ok: true, message: 'ok' }, session };
    },
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      session = restoreNa(applyFieldDrafts(session, spec, drafts));
      return freezeSession(cloneSession(session));
    },
    resetSession() {
      session = createEmptySession(spec);
    },
    syncInstrument() {},
    addTrial() {
      session = addSessionTrial(session, spec);
      return freezeSession(cloneSession(session));
    },
    removeTrial(rowId: string, confirmed = false) {
      const result = removeSessionTrial(session, spec, rowId, confirmed);
      session = result.session;
      return {
        session: freezeSession(cloneSession(session)),
        needsConfirm: result.needsConfirm
      };
    }
  };
  return {
    host,
    getLiveSession: () => session
  };
}

export function createKinematicsHost(): {
  host: DataWorkspaceHost;
  getLiveSession: () => ReturnType<typeof createEmptySession>;
} {
  return createSpecHost(kinematicsWorkspaceSpec);
}

export function createKinematicsChartHost(): {
  host: DataWorkspaceHost;
  getLiveSession: () => ReturnType<typeof createEmptySession>;
} {
  return createSpecHost(kinematicsChartWorkspaceSpec, {
    naCells: [{ trialIndex: 0, field: 'speed' }]
  });
}

export function kinematicsReady(
  session: ReturnType<typeof createEmptySession>,
  field: string
): boolean {
  return isFieldReady(session, kinematicsWorkspaceSpec, field);
}

export { formatResultText };
