import { describe, expect, it } from 'vitest';
import { createFixedStepper } from '../../src/core/fixed-step';

describe('createFixedStepper', () => {
  it('should consume single step when frameDt equals dt', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    expect(stepper.consume(1 / 60)).toBe(1);
  });

  it('should consume multiple steps', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    expect(stepper.consume(3 / 60)).toBe(3);
  });

  it('should respect maxSubSteps', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 2 });
    expect(stepper.consume(10 / 60)).toBe(2);
  });

  it('should return 0 when frameDt is less than dt', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    expect(stepper.consume(1 / 120)).toBe(0);
  });

  it('should handle negative frameDt as 0', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    expect(stepper.consume(-1)).toBe(0);
  });

  it('should reset accumulator', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    stepper.consume(1 / 120); // partial accumulation
    stepper.reset();
    expect(stepper.consume(1 / 120)).toBe(0);
  });

  it('should accumulate across multiple frames', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    expect(stepper.consume(1 / 120)).toBe(0); // 0.5 dt accumulated
    expect(stepper.consume(1 / 120)).toBe(1); // another 0.5 dt triggers step
  });
});
