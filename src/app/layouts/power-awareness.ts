/**
 * 电量与网络状态检测
 *
 * 检测低电量和弱网/省流量模式，用于自动降级到轻量布局。
 */

function isBatteryNavigator(nav: Navigator): nav is Navigator & { getBattery(): Promise<{ charging: boolean; level: number }> } {
  return 'getBattery' in nav && typeof (nav as Record<string, unknown>).getBattery === 'function';
}

function isConnectionNavigator(nav: Navigator): nav is Navigator & { connection: { saveData?: boolean; effectiveType?: string } } {
  return 'connection' in nav && (nav as Record<string, unknown>).connection !== undefined;
}

/**
 * 检测是否处于低功耗模式（低电量或弱网）
 * @returns 若应启用低功耗模式则返回 true
 */
export async function detectLowPowerMode(): Promise<boolean> {
  try {
    if (isBatteryNavigator(navigator)) {
      const battery = await navigator.getBattery();
      if (!battery.charging && battery.level < 0.2) {
        return true;
      }
    }
    if (isConnectionNavigator(navigator)) {
      const conn = navigator.connection;
      if (conn.saveData || /2g|slow-2g/.test(conn.effectiveType || '')) {
        return true;
      }
    }
  } catch {
    // API 不可用，忽略
  }
  return false;
}
