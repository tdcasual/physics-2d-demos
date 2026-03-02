export type FixedStepperConfig = {
  dt: number;
  maxSubSteps: number;
};

export function createFixedStepper(config: FixedStepperConfig) {
  let accumulator = 0;

  return {
    consume(frameDt: number): number {
      accumulator += Math.max(0, frameDt);
      let steps = 0;

      while (accumulator >= config.dt && steps < config.maxSubSteps) {
        accumulator -= config.dt;
        steps += 1;
      }

      if (steps === config.maxSubSteps) {
        accumulator = 0;
      }

      return steps;
    }
  };
}
