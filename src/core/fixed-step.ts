/**
 * 固定步长模拟器
 * 将可变帧时间拆分为固定物理步长，确保物理模拟稳定性
 */

/** 固定步长模拟器配置 */
export type FixedStepperConfig = {
  /** 每步时间间隔（秒） */
  dt: number;
  /** 最大子步数（防止帧率骤降时过度追赶） */
  maxSubSteps: number;
};

/**
 * 创建固定步长模拟器
 * @param config - 步长配置
 * @returns 步长消耗器（consume 返回当前帧需要执行的步数）
 */
export function createFixedStepper(config: FixedStepperConfig) {
  let accumulator = 0;

  return {
    /**
     * 消耗帧时间，返回应执行的固定步数
     * @param frameDt - 当前帧时间（秒）
     * @returns 需要执行的固定步数
     */
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
    },
    /** 重置累加器 */
    reset(): void {
      accumulator = 0;
    }
  };
}
