/**
 * 干涉读数游标卡尺 — DOM 结构装配
 */

export type InterferenceVernierCaliperDom = {
  mainTicksContainer: HTMLDivElement;
  vernierTicksContainer: HTMLDivElement;
  slider: HTMLDivElement;
  stripeLayer: HTMLDivElement;
  crosshairSystem: HTMLDivElement;
  readoutDisplay: HTMLDivElement;
  tipsEl: HTMLDivElement;
  knob: HTMLDivElement;
  instrumentEl: HTMLDivElement;
  mainRuler: HTMLElement;
  headerPanel: HTMLElement;
};

export function createInstrumentDom(
  root: HTMLDivElement,
  shadow: ShadowRoot
): InterferenceVernierCaliperDom {
  root.innerHTML = `
    <p class="pan-hint" data-instrument-pan="true">左右滑查看完整卡尺</p>
    <div class="header-panel">
      <div class="readout-display" id="readout">0.840 cm</div>
      <div class="tips" id="tips-text">
        <strong>操作说明：</strong> 拖动中间滑块进行粗调，横向拖动右侧旋钮进行精确微调。<br>
        <i>*若屏幕较窄导致两侧不可见，可在黑色背景处滑动平移。</i>
      </div>
    </div>
    <div class="scroll-wrapper">
      <div class="instrument-container" id="instrument">
        <div class="main-ruler">
          <div class="ticks-container" id="main-ticks"></div>
        </div>
        <div class="slider-assembly" id="slider">
          <div class="vernier-ruler">
            <div class="vernier-ticks-container" id="vernier-ticks"></div>
          </div>
          <div class="slider-body">
            <div class="lens-assembly">
              <div class="lens-glass">
                <div class="stripe-layer" id="stripe-layer"></div>
                <div class="crosshair-system" id="crosshair-system">
                  <div class="crosshair-v"></div>
                  <div class="crosshair-h"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="screw-assembly">
            <div class="screw-thread"></div>
            <div class="knob" id="knob" title="水平拖动旋钮以微调"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const qs = <T extends Element>(id: string) =>
    shadow.getElementById(id) as unknown as T;

  return {
    mainTicksContainer: qs<HTMLDivElement>('main-ticks'),
    vernierTicksContainer: qs<HTMLDivElement>('vernier-ticks'),
    slider: qs<HTMLDivElement>('slider'),
    stripeLayer: qs<HTMLDivElement>('stripe-layer'),
    crosshairSystem: qs<HTMLDivElement>('crosshair-system'),
    readoutDisplay: qs<HTMLDivElement>('readout'),
    tipsEl: qs<HTMLDivElement>('tips-text'),
    knob: qs<HTMLDivElement>('knob'),
    instrumentEl: qs<HTMLDivElement>('instrument'),
    mainRuler: root.querySelector('.main-ruler') as HTMLElement,
    headerPanel: root.querySelector('.header-panel') as HTMLElement
  };
}
