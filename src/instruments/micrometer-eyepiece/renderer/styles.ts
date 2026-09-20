/**
 * 高精度干涉测微仪 — Shadow DOM 样式（逐字搬移自原 instrument.view.ts）
 */

export const CSS = `
:host {
  --border-dark: #2c3338;
  --case-bg: #b5bcc2;
  --ring-outer: #848d94;
  --ring-inner: #545c62;
  --sleeve-bg: #d7dadd;
  --thimble-bevel: #e2e5e7;
  --thimble-body: #cfd3d6;
  --scale-color: #1a1c1e;
  --tick-gap-x: 11px;
  --tick-gap-y: 8px;
}

.micrometer-root {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: var(--instrument-align, center);
  width: 100%;
  height: 100%;
  padding-top: 15px;
  box-sizing: border-box;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

.micrometer-root.is-narrow .pan-hint {
  display: block;
  position: sticky;
  left: 0;
  width: var(--instrument-viewport, 100%);
  max-width: 100%;
}

.micrometer-root.is-narrow .dashboard {
  display: none;
}

.micrometer-system {
  display: flex;
  align-items: center;
  position: relative;
  transform-origin: top left;
  margin-left: var(--instrument-offset, 0px);
}

.micrometer-root.is-narrow .micrometer-system {
  min-width: 915px;
}

.case {
  width: 240px;
  height: 240px;
  background-color: var(--case-bg);
  border: 4px solid var(--border-dark);
  border-radius: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 10;
  box-shadow: 10px 10px 20px rgba(0,0,0,0.15);
  cursor: grab;
}

.case:active {
  cursor: grabbing;
}

.lens-outer-ring {
  width: 200px;
  height: 200px;
  background-color: var(--ring-outer);
  border: 4px solid var(--border-dark);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.lens-inner-ring {
  width: 176px;
  height: 176px;
  background-color: var(--ring-inner);
  border: 4px solid var(--border-dark);
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.lens-view {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #fbd1a6 60%, #e09854 100%);
  position: absolute;
  will-change: transform;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 15px,
    rgba(200, 80, 20, 0.2) 22px,
    rgba(200, 80, 20, 0.4) 25px,
    rgba(200, 80, 20, 0.2) 28px,
    transparent 35px,
    transparent 50px
  );
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
  width: 2px;
  height: 100%;
  background-color: rgba(20, 20, 20, 0.85);
  left: 50%;
  transform: translateX(-50%);
}

.crosshair-h {
  position: absolute;
  height: 2px;
  width: 100%;
  background-color: rgba(20, 20, 20, 0.85);
  top: 50%;
  transform: translateY(-50%);
}

.sleeve-container {
  position: absolute;
  left: 215px;
  height: 165px;
  width: 250px;
  background: linear-gradient(to bottom, #e8eaec 0%, var(--sleeve-bg) 30%, var(--sleeve-bg) 70%, #b8bcbf 100%);
  border-top: 4px solid var(--border-dark);
  border-bottom: 4px solid var(--border-dark);
  z-index: 5;
}

.baseline {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--scale-color);
  transform: translateY(-50%);
}

.sleeve-scales {
  position: absolute;
  top: 0;
  left: 30px;
  width: 100%;
  height: 100%;
}

.sleeve-tick {
  position: absolute;
  width: 2px;
  background-color: var(--scale-color);
}

.sleeve-tick.major {
  bottom: 50%;
  height: 12px;
}

.sleeve-tick.major.numbered {
  height: 18px;
}

.sleeve-tick.minor {
  top: 50%;
  height: 10px;
}

.sleeve-number {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-family: "Times New Roman", Times, serif;
  font-size: 14px;
  font-weight: bold;
  color: var(--scale-color);
}

/* 反转模式：mm 刻度在基准线下方，0.5mm 刻度在上方 */
.sleeve-container.scale-inverted .sleeve-tick.major {
  top: 50%;
  bottom: auto;
}

.sleeve-container.scale-inverted .sleeve-tick.minor {
  bottom: 50%;
  top: auto;
}

.sleeve-container.scale-inverted .sleeve-number {
  top: 22px;
  bottom: auto;
}

.thimble-group {
  position: absolute;
  left: 245px;
  display: flex;
  align-items: center;
  z-index: 8;
  cursor: grab;
  filter: drop-shadow(-4px 0px 6px rgba(0,0,0,0.2));
  will-change: transform;
}

.thimble-group:active {
  cursor: grabbing;
}

.thimble-bevel {
  width: 35px;
  height: 180px;
  background: linear-gradient(to bottom, #f0f2f3 0%, var(--thimble-bevel) 20%, var(--thimble-bevel) 80%, #c4c8cb 100%);
  border: 4px solid var(--border-dark);
  border-right: none;
  border-radius: 6px 0 0 6px;
  position: relative;
  overflow: hidden;
}

.thimble-bevel::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(0,0,0,0.15));
}

.thimble-scales-strip {
  position: absolute;
  width: 100%;
  left: 0;
  bottom: 0;
}

.thimble-tick {
  position: absolute;
  height: 2px;
  background-color: var(--scale-color);
  left: 0;
}

.thimble-tick.major { width: 15px; }
.thimble-tick.minor { width: 10px; }

.thimble-number {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-family: "Times New Roman", Times, serif;
  font-size: 14px;
  font-weight: bold;
  color: var(--scale-color);
  line-height: 1;
}

.thimble-body {
  width: 100px;
  height: 180px;
  background: linear-gradient(to bottom, #f4f5f6 0%, var(--thimble-body) 20%, var(--thimble-body) 80%, #b5b9bc 100%);
  border: 4px solid var(--border-dark);
  border-left: 1px solid rgba(0,0,0,0.3);
}

.ratchet {
  width: 45px;
  height: 120px;
  background: linear-gradient(to bottom, #eff1f2 0%, #c8cccf 20%, #c8cccf 80%, #a2a6a9 100%);
  border: 4px solid var(--border-dark);
  border-left: none;
  border-radius: 0 8px 8px 0;
}

.dashboard {
  margin-top: 50px;
  background: transparent;
  padding: 15px 30px;
  text-align: center;
  z-index: 20;
}

.readout {
  font-family: "Courier New", Courier, monospace;
  font-size: 32px;
  font-weight: bold;
  color: #1565c0;
  letter-spacing: 2px;
}

.hint {
  font-size: 13px;
  color: #555;
  margin-top: 8px;
}
`;
