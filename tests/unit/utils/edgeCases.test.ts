import { describe, it, expect } from 'vitest';
import { getDriverDisplayName, getTeamDisplayName, getCurrentSeason } from '../../../src/utils/f1Data';
import { COUNTRY_TRANSLATIONS, TEAM_TRANSLATIONS } from '../../../src/utils/translations';

describe('edge case regressions', () => {
  describe('getDriverDisplayName', () => {
    it('should handle undefined firstName', () => {
      const driver = {
        firstName: undefined as any,
        lastName: 'Hamilton',
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });

    it('should handle null values', () => {
      const driver = {
        firstName: null as any,
        lastName: null as any,
        firstNameCn: null as any,
        lastNameCn: null as any,
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });

    it('should treat undefined and empty cn fields consistently', () => {
      const driver1 = {
        firstName: 'Lewis',
        lastName: 'Hamilton',
        firstNameCn: undefined,
        lastNameCn: undefined,
      };
      const driver2 = {
        firstName: 'Lewis',
        lastName: 'Hamilton',
        firstNameCn: '',
        lastNameCn: '',
      };
      expect(getDriverDisplayName(driver1)).toBe(getDriverDisplayName(driver2));
    });

    it('should handle unicode-only names', () => {
      const driver = {
        firstName: '姹夊瘑灏旈】',
        lastName: '鍒樻槗鏂?',
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });

    it('should handle special characters in names', () => {
      const driver = {
        firstName: "O'conner",
        lastName: 'N盲str枚m',
        firstNameCn: '濂ュ悍绾?',
        lastNameCn: '鍐呮柉鐗逛鸡',
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });
  });

  describe('getTeamDisplayName', () => {
    it('should handle empty object', () => {
      expect(getTeamDisplayName({} as any)).toBeDefined();
    });

    it('should handle null team', () => {
      expect(getTeamDisplayName(null as any)).toBeDefined();
    });
  });

  describe('getCurrentSeason', () => {
    it('should return a reasonable year', () => {
      const season = getCurrentSeason();
      const expectedMax = new Date().getFullYear() + 1;
      expect(season).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('translation completeness', () => {
    it('should include important country translations', () => {
      const importantCountries = [
        'USA',
        'United States',
        'UAE',
        'United Arab Emirates',
        'UK',
        'United Kingdom',
        'South Korea',
        'Korea',
      ];

      const missing = importantCountries.filter((country) => !COUNTRY_TRANSLATIONS[country]);
      expect(missing).toHaveLength(0);
    });

    it('should include 2026 team translations', () => {
      const teams2026 = [
        'Ferrari',
        'McLaren',
        'Mercedes',
        'Red Bull Racing',
        'Aston Martin',
        'Williams',
        'Alpine',
        'Haas',
        'Racing Bulls',
        'Kick Sauber',
      ];

      const missing = teams2026.filter((team) => !TEAM_TRANSLATIONS[team]);
      expect(missing).toHaveLength(0);
    });
  });

  describe('performance guardrail', () => {
    it('should process many driver display names quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i += 1) {
        getDriverDisplayName({
          firstName: 'Driver',
          lastName: `Name${i}`,
          firstNameCn: '杞︽墜',
          lastNameCn: `濮撳悕${i}`,
        });
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });
});
