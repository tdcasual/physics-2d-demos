import type { TeachingTheme } from '../../platform/standards';

/* ------------------------------------------------------------------
   Instrument Lifecycle Interfaces
   ------------------------------------------------------------------ */

export interface InstrumentParams {
  [key: string]: unknown;
}

export interface InstrumentState {
  currentReading: number;
  zeroOffset: number;
}

export interface InstrumentSim<
  State extends InstrumentState,
  Params extends InstrumentParams
> {
  getState(): State;
  setParams(params: Partial<Params>): void;
  step(dt: number): void;
  reset(): void;
}

export interface InstrumentViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InstrumentView<State extends InstrumentState> {
  render(state: State): void;
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setViewport(viewport: InstrumentViewport): void;
  dispose(): void;
}

export type InstrumentCategory =
  | 'measurement'
  | 'timing'
  | 'optical'
  | 'electrical'
  | 'mechanical';

export interface InstrumentMeta<Params extends InstrumentParams> {
  id: string;
  title: string;
  category: InstrumentCategory;
  description: string;
  defaultParams: Params;
  unit?: string;
  precision?: number;
  /**
   * 渲染技术声明（缺省 'canvas'）。按元素密度选择：
   * 刻度盘/指针/读数窗类（近静态、元素少、重精细标注）默认 'svg'；
   * 密集条纹/波形/场图案类（密度即信息）用 'canvas'。
   * SVG 仪器的 view 忽略传入的 canvas，改为在 canvas.parentElement 内
   * 插入一个 <svg> 兄弟节点渲染（契约测试 instrument-entries 会校验
   * 声明与实际渲染面一致）。详见 src/instruments/STANDARDS.md「View 规范」。
   */
  renderTech?: 'canvas' | 'svg';
}

export interface InstrumentFactory<
  State extends InstrumentState,
  Params extends InstrumentParams
> {
  meta: InstrumentMeta<Params>;
  createSim(): InstrumentSim<State, Params>;
  createView(options: {
    canvas: HTMLCanvasElement;
    theme: TeachingTheme;
    viewport?: InstrumentViewport;
  }): InstrumentView<State>;
}

/* ------------------------------------------------------------------
   Measurable Instrument Extensions
   ------------------------------------------------------------------ */

export interface MeasurableInstrument {
  /** 当前总读数 = 机械读数 + 零位修正 */
  getReading(): number;

  /** 读数发生变化时触发 */
  onReadingChange(callback: (reading: number) => void): () => void;

  /** 十字准星对准干涉条纹中心时触发 */
  onAlign(callback: () => void): () => void;

  /** 读数接近量程上下限时触发 */
  onLimit(callback: () => void): () => void;
}

/* ------------------------------------------------------------------
   Serializable Instrument Extensions
   ------------------------------------------------------------------ */

export interface SerializableInstrument {
  serialize(): string;
  deserialize(json: string): void;
}

/* ------------------------------------------------------------------
   Calibratable Instrument Extensions
   ------------------------------------------------------------------ */

export interface CalibratableInstrument {
  /** 设置零位修正值 */
  setZero(val: number): void;
  /** 获取当前零位修正值 */
  getZero(): number;
  /** 获取当前校准偏移（同 getZero，用于外部场景一致性） */
  getCalibrationOffset(): number;
}
