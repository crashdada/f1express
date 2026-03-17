import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCapacitor, isAndroid, isIOS, isWeb } from '../../src/utils/platform';

const mockCapacitor = {
  isNative: true,
  getPlatform: () => 'android',
};

describe('platform utilities', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      Capacitor: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isCapacitor', () => {
    it('should return false when Capacitor is not defined', () => {
      expect(isCapacitor()).toBe(false);
    });

    it('should return true when Capacitor is defined', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: mockCapacitor,
        writable: true,
      });
      expect(isCapacitor()).toBe(true);
    });
  });

  describe('isAndroid', () => {
    it('should return false when Capacitor is not defined', () => {
      expect(isAndroid()).toBe(false);
    });

    it('should return true when running on Android', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: { getPlatform: () => 'android' },
        writable: true,
      });
      expect(isAndroid()).toBe(true);
    });

    it('should return false when running on iOS', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: { getPlatform: () => 'ios' },
        writable: true,
      });
      expect(isAndroid()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('should return false when Capacitor is not defined', () => {
      expect(isIOS()).toBe(false);
    });

    it('should return true when running on iOS', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: { getPlatform: () => 'ios' },
        writable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('should return false when running on Android', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: { getPlatform: () => 'android' },
        writable: true,
      });
      expect(isIOS()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('should return true when Capacitor is not defined', () => {
      expect(isWeb()).toBe(true);
    });

    it('should return false when Capacitor is defined', () => {
      Object.defineProperty(window, 'Capacitor', {
        value: mockCapacitor,
        writable: true,
      });
      expect(isWeb()).toBe(false);
    });
  });
});
