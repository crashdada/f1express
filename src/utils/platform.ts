import { Capacitor } from '@capacitor/core';

type WindowCapacitor = {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
};

const getWindowCapacitor = (): WindowCapacitor | undefined =>
    (globalThis as { Capacitor?: WindowCapacitor }).Capacitor;

export const getPlatform = (): string => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform && platform !== 'web') {
            return platform;
        }
    } catch {
        // Ignore and fall back to the bridged object when present.
    }

    return getWindowCapacitor()?.getPlatform?.() ?? 'web';
};

export const isCapacitor = (): boolean => {
    try {
        if (Capacitor.isNativePlatform()) {
            return true;
        }
    } catch {
        // Ignore and fall back to the bridged object when present.
    }

    const bridgedCapacitor = getWindowCapacitor();
    return Boolean(
        bridgedCapacitor?.isNativePlatform?.() ||
        (bridgedCapacitor?.getPlatform && bridgedCapacitor.getPlatform() !== 'web')
    );
};

export const isAndroid = (): boolean =>
    isCapacitor() && getPlatform() === 'android';

export const isIOS = (): boolean =>
    isCapacitor() && getPlatform() === 'ios';

export const isWeb = (): boolean => !isCapacitor();
