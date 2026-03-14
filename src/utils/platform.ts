/**
 * 平台检测工具
 * 用于区分 Web 浏览器 / Capacitor (Android/iOS) 运行环境
 */

/** 当前是否运行在 Capacitor 原生容器中 */
export const isCapacitor = (): boolean =>
    typeof (window as any).Capacitor !== 'undefined';

/** 当前是否运行在 Android 上 */
export const isAndroid = (): boolean =>
    isCapacitor() && (window as any).Capacitor?.getPlatform?.() === 'android';

/** 当前是否运行在 iOS 上 */
export const isIOS = (): boolean =>
    isCapacitor() && (window as any).Capacitor?.getPlatform?.() === 'ios';

/** 当前是否运行在纯 Web 浏览器中 */
export const isWeb = (): boolean => !isCapacitor();
