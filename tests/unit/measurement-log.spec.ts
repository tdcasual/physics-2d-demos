import { describe, expect, it, vi } from 'vitest';
import { createMeasurementLog } from '../../src/platform/measurement-log';

const columns = [
  { key: 'u', label: 'U', unit: 'V', digits: 2 },
  { key: 'i', label: 'I', unit: 'A', digits: 3 }
] as const;

describe('createMeasurementLog', () => {
  it('records, caps, removes, and emits csv with formatted values', () => {
    const log = createMeasurementLog(columns, { maxRows: 2 });
    log.record({ u: 1.234, i: 0.1 });
    log.record({ u: 2, i: 0.2 });
    log.record({ u: 3, i: 0.3 });
    expect(log.rows()).toEqual([
      { u: 2, i: 0.2 },
      { u: 3, i: 0.3 }
    ]);
    log.remove(0);
    expect(log.rows()).toHaveLength(1);
    expect(log.toCsv()).toBe('U (V),I (A)\n3.00,0.300');
    log.clear();
    expect(log.rows()).toEqual([]);
  });

  it('notifies subscribers and ignores out-of-range remove', () => {
    const log = createMeasurementLog(columns);
    const listener = vi.fn();
    const stop = log.subscribe(listener);
    log.record({ u: 1, i: 0.5 });
    log.remove(9);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    log.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
