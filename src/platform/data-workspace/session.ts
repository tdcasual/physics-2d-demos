type DataWorkspaceSpec = {
  minRows?: number;
  maxRows?: number;
  initialRows?: number;
};
type FieldCheckState = {
  raw: string;
  value: number;
  checked: boolean;
  stale: boolean;
  [key: string]: unknown;
};
type TrialRecord = {
  id: string;
  fields: Record<string, FieldCheckState | undefined>;
};
type DataWorkspaceSession = {
  active: boolean;
  currentTrial: number;
  completed: boolean;
  lockedInstrumentId?: string;
  nextRowSeq: number;
  summary: Record<string, FieldCheckState | undefined>;
  trials: TrialRecord[];
};

function resolveRowLimits(spec: DataWorkspaceSpec): {
  minRows: number;
  maxRows: number;
  initialRows: number;
} {
  const minRows = Math.max(1, Math.floor(spec.minRows ?? 1));
  const maxRows = Math.max(minRows, Math.floor(spec.maxRows ?? minRows));
  const initialRows = Math.min(
    maxRows,
    Math.max(minRows, Math.floor(spec.initialRows ?? minRows))
  );
  return { minRows, maxRows, initialRows };
}

export function createTrialRecord(id: string): TrialRecord {
  return { id, fields: {} };
}

export function cloneSession(
  session: DataWorkspaceSession
): DataWorkspaceSession {
  const cloneField = (
    field: FieldCheckState | undefined
  ): FieldCheckState | undefined => (field ? { ...field } : undefined);
  return {
    active: session.active,
    currentTrial: session.currentTrial,
    completed: session.completed,
    lockedInstrumentId: session.lockedInstrumentId,
    nextRowSeq: session.nextRowSeq,
    summary: Object.fromEntries(
      Object.entries(session.summary).map(([key, value]) => [
        key,
        cloneField(value)
      ])
    ),
    trials: session.trials.map((trial) => ({
      id: trial.id,
      fields: Object.fromEntries(
        Object.entries(trial.fields).map(([key, value]) => [
          key,
          cloneField(value)
        ])
      )
    }))
  };
}

export function freezeSession(
  session: DataWorkspaceSession
): DataWorkspaceSession {
  for (const trial of session.trials) {
    Object.freeze(trial.fields);
    Object.freeze(trial);
  }
  Object.freeze(session.summary);
  Object.freeze(session.trials);
  return Object.freeze(session);
}

export function createEmptySession(
  specOrCount: DataWorkspaceSpec | number = 1
): DataWorkspaceSession {
  const count =
    typeof specOrCount === 'number'
      ? Math.max(1, Math.floor(specOrCount))
      : resolveRowLimits(specOrCount).initialRows;
  return {
    active: false,
    trials: Array.from({ length: count }, (_, i) =>
      createTrialRecord(`row-${i + 1}`)
    ),
    currentTrial: 0,
    summary: {},
    completed: false,
    lockedInstrumentId: undefined,
    nextRowSeq: count + 1
  };
}
