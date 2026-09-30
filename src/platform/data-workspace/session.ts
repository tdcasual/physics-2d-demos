import { resolveRowLimits } from './spec-queries';
import type {
  DataWorkspaceSession,
  DataWorkspaceSpec,
  FieldCheckState,
  TrialRecord
} from './types';

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
