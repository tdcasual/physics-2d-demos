/**
 * 仪器组件库 — 页面入口
 */

import '../../styles/index.css';
import { bootInstrumentLibrary } from './instrument-library';

const dispose = bootInstrumentLibrary();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  dispose();
});
