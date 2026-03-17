import { describe, it, expect } from 'vitest';
import { getDriverDisplayName, getTeamDisplayName, getCurrentSeason } from '../../src/utils/f1Data';
import { COUNTRY_TRANSLATIONS, TEAM_TRANSLATIONS } from '../../src/utils/translations';

describe('🔴 Bug 发现测试 - 寻找代码中的问题', () => {
  describe('getDriverDisplayName - 边界情况测试', () => {
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

    it('should handle undefined cn fields vs empty string', () => {
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
      const result1 = getDriverDisplayName(driver1);
      const result2 = getDriverDisplayName(driver2);
      expect(result1).toBe(result2);
    });

    it('should handle unicode-only names', () => {
      const driver = {
        firstName: '汉密尔顿',
        lastName: '刘易斯',
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });

    it('should handle special characters in names', () => {
      const driver = {
        firstName: "O'conner",
        lastName: 'Näström',
        firstNameCn: '奥康纳',
        lastNameCn: '内斯特伦',
      };
      expect(getDriverDisplayName(driver)).toBeDefined();
    });
  });

  describe('getTeamDisplayName - 边界情况测试', () => {
    it('should handle empty object', () => {
      const team = {} as any;
      expect(getTeamDisplayName(team)).toBeDefined();
    });

    it('should handle null team', () => {
      expect(getTeamDisplayName(null as any)).toBeDefined();
    });
  });

  describe('getCurrentSeason - 异常测试', () => {
    it('should return reasonable year', () => {
      const season = getCurrentSeason();
      const now = new Date();
      const expectedMax = now.getFullYear() + 1;
      expect(season).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('翻译完整性测试 - 发现缺失的翻译', () => {
    it('应该有 F1 常用国家的中文翻译', () => {
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

      const missing = importantCountries.filter((c) => !COUNTRY_TRANSLATIONS[c]);
      if (missing.length > 0) {
        console.log('⚠️ 缺失的国家翻译:', missing);
      }
      expect(missing).toHaveLength(0);
    });

    it('应该有 2026 赛季所有车队的翻译', () => {
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

      const missing = teams2026.filter((t) => !TEAM_TRANSLATIONS[t]);
      if (missing.length > 0) {
        console.log('⚠️ 缺失的车队翻译:', missing);
      }
      expect(missing).toHaveLength(0);
    });
  });

  describe('性能测试 - 大数据处理', () => {
    it('应该能在合理时间内处理大量车手数据', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        getDriverDisplayName({
          firstName: 'Driver',
          lastName: `Name${i}`,
          firstNameCn: '车手',
          lastNameCn: `姓名${i}`,
        });
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });
});
