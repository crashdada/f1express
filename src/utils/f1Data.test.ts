import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDriverDisplayName, getCurrentSeason, getTeamDisplayName, loadF1Data } from './f1Data';

describe('f1Data utils', () => {
  describe('getDriverDisplayName', () => {
    it('should return Chinese name format if cn fields are present', () => {
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
        firstNameCn: '兰多',
        lastNameCn: '诺里斯',
      };
      expect(getDriverDisplayName(driver)).toBe('诺里斯兰多');
    });

    it('should return English name format if cn fields are missing', () => {
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
      };
      expect(getDriverDisplayName(driver)).toBe('Lando Norris');
    });

    it('should return English name format if partial cn fields are missing', () => {
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
        firstNameCn: '兰多',
      };
      expect(getDriverDisplayName(driver)).toBe('Lando Norris');
    });

    it('should handle empty strings as missing', () => {
      const driver = {
        firstName: 'Max',
        lastName: 'Verstappen',
        firstNameCn: '',
        lastNameCn: '',
      };
      expect(getDriverDisplayName(driver)).toBe('Max Verstappen');
    });
  });

  describe('getCurrentSeason', () => {
    it('should return the current year', () => {
      const currentYear = new Date().getFullYear();
      expect(getCurrentSeason()).toBe(currentYear);
    });

    it('should return a valid year number', () => {
      const season = getCurrentSeason();
      expect(typeof season).toBe('number');
      expect(season).toBeGreaterThanOrEqual(2026);
      expect(season).toBeLessThan(2030);
    });
  });

  describe('getTeamDisplayName', () => {
    it('should return Chinese name if available', () => {
      const team = {
        name: 'Ferrari',
        nameCn: '法拉利',
      };
      expect(getTeamDisplayName(team)).toBe('法拉利');
    });

    it('should return fullName if cn is missing', () => {
      const team = {
        name: 'Ferrari',
        fullName: 'Scuderia Ferrari',
      };
      expect(getTeamDisplayName(team)).toBe('Scuderia Ferrari');
    });

    it('should return name if both cn and fullName are missing', () => {
      const team = {
        name: 'Ferrari',
      };
      expect(getTeamDisplayName(team)).toBe('Ferrari');
    });

    it('should prefer cn over fullName', () => {
      const team = {
        name: 'Red Bull',
        fullName: 'Red Bull Racing',
        nameCn: '红牛',
      };
      expect(getTeamDisplayName(team)).toBe('红牛');
    });
  });

  describe('loadF1Data', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
      vi.stubGlobal('indexedDB', {
        open: vi.fn(() => ({
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
        })),
        deleteDatabase: vi.fn(),
      });
      vi.stubGlobal('initSqlJs', vi.fn());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return empty data when sql.js is not loaded', async () => {
      (window as any).initSqlJs = undefined;
      const result = await loadF1Data();
      expect(result.drivers).toEqual([]);
      expect(result.teams).toEqual([]);
      expect(result.raceResults).toEqual([]);
    });
  });
});
