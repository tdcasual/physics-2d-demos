/**
 * 干涉读数游标卡尺 — 样式表（Shadow DOM 内联 CSS）
 */

export const CSS = `
:host {
  --bg-color: #e8eaec;
  --main-ruler-bg: #c5c7cb;
  --main-ruler-dark: #a0a2a6;
  --vernier-bg-top: #f8f9fa;
  --vernier-bg-bottom: #dce0e3;
  --slider-bg: #5f6267;
  --lens-border-outer: #3d4044;
  --lens-border-inner: #808489;
  --lens-orange-center: #ffce99;
  --lens-orange-edge: #f58f29;
  --tick-color: #222;
}

.microscope-root {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  background: transparent;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  user-select: none;
  overflow: visible;
  position: relative;
}

.pan-hint {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 16;
  margin: 0;
  padding: 6px 8px;
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  color: #475569;
  background: rgba(248, 250, 252, 0.92);
  pointer-events: auto;
  touch-action: pan-x;
  white-space: nowrap;
}

.microscope-root.is-narrow .pan-hint {
  display: block;
}

.header-panel {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 20;
  padding: 0;
  text-align: right;
}

.readout-display {
  font-size: 18px;
  font-weight: bold;
  font-family: monospace;
  background: #fff;
  color: #1565c0;
  border: 2px solid #ddd;
  padding: 5px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 0 10px rgba(21,101,192,0.08);
  letter-spacing: 1px;
  display: inline-block;
}

.tips {
  font-size: 14px;
  color: #555;
  margin-top: 10px;
  line-height: 1.5;
}

.scroll-wrapper {
  flex: 1;
  width: 100%;
  overflow: visible;
  display: flex;
  justify-content: var(--instrument-justify, center);
  align-items: flex-start;
  padding: 10px;
  box-sizing: border-box;
}

@media (max-width: 860px) {
  .scroll-wrapper {
    justify-content: flex-start;
  }
}

.instrument-container {
  position: relative;
  width: 695px;
  height: 250px;
  background-color: transparent;
  margin-left: var(--instrument-offset, 0px);
  overflow: visible;
  flex-shrink: 0;
  transform-origin: top left;
}

.main-ruler {
  position: absolute;
  top: 5px;
  left: 0;
  width: 100%;
  height: 55px;
  background: linear-gradient(to bottom, var(--main-ruler-bg) 0%, var(--main-ruler-bg) 80%, var(--main-ruler-dark) 100%);
  border-bottom: 2px solid #111;
  box-shadow: inset 0 2px 5px rgba(255,255,255,0.8);
  cursor: grab;
}
.main-ruler:active {
  cursor: grabbing;
}

.ticks-container {
  position: absolute;
  bottom: 0;
  left: 29px;
  width: 672px;
  height: 100%;
}

.tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  background-color: var(--tick-color);
  transform: translateX(-50%);
}

.tick-label {
  position: absolute;
  bottom: 20px;
  transform: translateX(-50%);
  font-size: 18px;
  color: #111;
  font-weight: 500;
}

.slider-assembly {
  position: absolute;
  top: 60px;
  left: 0;
  width: 566px;
  height: 189px;
  will-change: transform;
  cursor: grab;
  touch-action: none;
}
.slider-assembly:active {
  cursor: grabbing;
}

.vernier-ruler {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 25px;
  background: linear-gradient(to bottom, var(--vernier-bg-top), var(--vernier-bg-bottom));
  clip-path: polygon(14px 0, 552px 0, 100% 100%, 0 100%);
  border-bottom: 1px solid #999;
}

.vernier-ticks-container {
  position: absolute;
  top: 0;
  left: 29px;
  width: 470px;
  height: 100%;
}

.vernier-tick {
  position: absolute;
  top: 0;
  width: 1px;
  background-color: var(--tick-color);
  transform: translateX(-50%);
}

.vernier-tick-label {
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  font-size: 11px;
  color: #222;
  font-weight: 500;
}

.slider-body {
  position: absolute;
  top: 25px;
  left: 0;
  width: 100%;
  height: 164px;
  background: linear-gradient(to bottom, #696c71, var(--slider-bg));
  box-shadow: 5px 10px 15px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.2);
  border-top: 1px solid #444;
}

.lens-assembly {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 163px;
  height: 163px;
  border-radius: 50%;
  background-color: var(--lens-border-outer);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1);
  border: 1px solid #222;
}

.lens-glass {
  width: 134px;
  height: 134px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #fbd1a6 60%, #e09854 100%);
  border: 4px solid var(--lens-border-inner);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
}

.stripe-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.crosshair-system {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  will-change: transform;
}

.crosshair-v {
  position: absolute;
  top: 0;
  left: calc(50% - 1px);
  width: 2px;
  height: 100%;
  background-color: rgba(20, 20, 20, 0.9);
  box-shadow: 1px 0 1px rgba(255,255,255,0.3);
}

.crosshair-h {
  position: absolute;
  top: calc(50% - 1px);
  left: 0;
  width: 100%;
  height: 2px;
  background-color: rgba(20, 20, 20, 0.9);
  box-shadow: 0 1px 1px rgba(255,255,255,0.3);
}

.screw-assembly {
  position: absolute;
  top: 82px;
  right: -88px;
  width: 88px;
  height: 50px;
  display: flex;
  align-items: center;
}

.screw-thread {
  width: 56px;
  height: 16px;
  background: repeating-linear-gradient(to right, #999 0px, #999 2px, #ccc 3px, #777 4px);
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  border-top: 1px solid #fff;
  border-bottom: 1px solid #333;
}

.knob {
  width: 24px;
  height: 37px;
  background: linear-gradient(to bottom, #666, #aaa, #444);
  border-radius: 3px;
  position: relative;
  cursor: ew-resize;
  box-shadow: 2px 5px 8px rgba(0,0,0,0.6), inset 1px 0 2px rgba(255,255,255,0.5);
  border: 1px solid #222;
  touch-action: none;
}

.knob::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.4) 4px, rgba(0,0,0,0.4) 5px);
  border-radius: 3px;
}

.knob:hover {
  filter: brightness(1.1);
}
`;
