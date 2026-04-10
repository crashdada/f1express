import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorState = vi.hoisted(() => ({
  native: false,
  platform: 'web',
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => capacitorState.native,
    getPlatform: () => capacitorState.platform,
  },
}));

import { getPlatform, isAndroid, isCapacitor, isIOS, isWeb } from '../../../src/utils/platform';

describe('platform utilities', () => {
  beforeEach(() => {
    capacitorState.native = false;
    capacitorState.platform = 'web';
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it('returns web defaults when no native bridge is present', () => {
    expect(isCapacitor()).toBe(false);
    expect(isAndroid()).toBe(false);
    expect(isIOS()).toBe(false);
    expect(isWeb()).toBe(true);
    expect(getPlatform()).toBe('web');
  });

  it('prefers the Capacitor core runtime when native', () => {
    capacitorState.native = true;
    capacitorState.platform = 'android';

    expect(isCapacitor()).toBe(true);
    expect(isAndroid()).toBe(true);
    expect(isIOS()).toBe(false);
    expect(isWeb()).toBe(false);
    expect(getPlatform()).toBe('android');
  });

  it('falls back to the bridged window object when core reports web', () => {
    (globalThis as { Capacitor?: { getPlatform: () => string } }).Capacitor = {
      getPlatform: () => 'ios',
    };

    expect(isCapacitor()).toBe(true);
    expect(isAndroid()).toBe(false);
    expect(isIOS()).toBe(true);
    expect(isWeb()).toBe(false);
    expect(getPlatform()).toBe('ios');
  });
});
