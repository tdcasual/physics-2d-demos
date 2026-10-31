/**
 * 测量记录：读数与完整数据工作区之间的中间层。
 * 只持有数值行；展示格式复用 platform/readout。
 */

import { formatReadoutNumber, type ReadoutPrecision } from './readout';

export type MeasurementColumn = {
  key: string;
  label: string;
  unit?: string;
} & ReadoutPrecision;

export type MeasurementLog = {
  columns: readonly MeasurementColumn[];
  rows(): readonly Readonly<Record<string, number>>[];
  record(row: Record<string, number>): void;
  remove(index: number): void;
  clear(): void;
  toCsv(): string;
  subscribe(listener: () => void): () => void;
};

export function createMeasurementLog(
  columns: readonly MeasurementColumn[],
  opts?: { maxRows?: number }
): MeasurementLog {
  const maxRows =
    typeof opts?.maxRows === 'number' && opts.maxRows > 0
      ? Math.floor(opts.maxRows)
      : Infinity;
  const keys = columns.map((column) => column.key);
  let rows: Array<Record<string, number>> = [];
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const pick = (row: Record<string, number>): Record<string, number> => {
    const next: Record<string, number> = {};
    for (const key of keys) {
      const value = row[key];
      next[key] =
        typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }
    return next;
  };

  return {
    columns,
    rows: () => rows.map((row) => ({ ...row })),
    record(row) {
      const next = [...rows, pick(row)];
      rows = next.length > maxRows ? next.slice(next.length - maxRows) : next;
      notify();
    },
    remove(index) {
      if (!Number.isInteger(index) || index < 0 || index >= rows.length) return;
      rows = rows.filter((_, i) => i !== index);
      notify();
    },
    clear() {
      if (rows.length === 0) return;
      rows = [];
      notify();
    },
    toCsv() {
      const header = columns
        .map((column) =>
          column.unit ? `${column.label} (${column.unit})` : column.label
        )
        .join(',');
      const body = rows.map((row) =>
        columns
          .map((column) => formatReadoutNumber(row[column.key] ?? 0, column))
          .join(',')
      );
      return [header, ...body].join('\n');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
