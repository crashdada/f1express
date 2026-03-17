import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_TRANSLATIONS,
  COUNTRY_TRANSLATIONS,
  TEAM_TRANSLATIONS,
  GP_TRANSLATIONS,
} from '../../src/utils/translations';

describe('translations', () => {
  describe('CIRCUIT_TRANSLATIONS', () => {
    it('should have translations for major circuits', () => {
      expect(CIRCUIT_TRANSLATIONS['Albert Park Grand Prix Circuit, Melbourne']).toBe('阿尔伯特公园赛道');
      expect(CIRCUIT_TRANSLATIONS['Bahrain International Circuit, Sakhir']).toBe('巴林国际赛道');
      expect(CIRCUIT_TRANSLATIONS['Circuit de Monaco, Monaco']).toBe('摩纳哥赛道');
      expect(CIRCUIT_TRANSLATIONS['Silverstone Circuit, Silverstone']).toBe('银石赛道');
    });

    it('should not have empty translation values', () => {
      const emptyTranslations = Object.entries(CIRCUIT_TRANSLATIONS).filter(
        ([, value]) => value === '' || value === undefined,
      );
      expect(emptyTranslations).toHaveLength(0);
    });

    it('should handle circuit name variations', () => {
      expect(CIRCUIT_TRANSLATIONS['Albert Park Circuit']).toBe('阿尔伯特公园赛道');
      expect(CIRCUIT_TRANSLATIONS['Melbourne Grand Prix Circuit']).toBe('墨尔本大奖赛赛道');
    });

    it('should have translation for modern F1 circuits', () => {
      expect(CIRCUIT_TRANSLATIONS['Las Vegas Strip Circuit, Las Vegas']).toBe('拉斯维加斯街道赛道');
      expect(CIRCUIT_TRANSLATIONS['Jeddah Corniche Circuit, Jeddah']).toBe('吉达滨海赛道');
      expect(CIRCUIT_TRANSLATIONS['Miami International Autodrome, Miami Gardens']).toBe('迈阿密国际赛车场');
    });
  });

  describe('COUNTRY_TRANSLATIONS', () => {
    it('should have translations for F1 countries', () => {
      expect(COUNTRY_TRANSLATIONS['Australia']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['United Kingdom']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['Italy']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['Germany']).toBeDefined();
    });

    it('should not have empty values', () => {
      const emptyTranslations = Object.entries(COUNTRY_TRANSLATIONS).filter(([, value]) => value === '');
      expect(emptyTranslations).toHaveLength(0);
    });
  });

  describe('TEAM_TRANSLATIONS', () => {
    it('should have translations for major teams', () => {
      expect(TEAM_TRANSLATIONS['Ferrari']).toBe('法拉利');
      expect(TEAM_TRANSLATIONS['McLaren']).toBe('迈凯伦');
      expect(TEAM_TRANSLATIONS['Mercedes']).toBe('梅赛德斯');
      expect(TEAM_TRANSLATIONS['Red Bull']).toBe('红牛');
    });

    it('should return original name if no translation exists', () => {
      expect(TEAM_TRANSLATIONS['Unknown Team'] || 'Unknown Team').toBe('Unknown Team');
    });
  });

  describe('GP_TRANSLATIONS', () => {
    it('should have translations for Grand Prix races', () => {
      expect(GP_TRANSLATIONS['Australian Grand Prix']).toBe('澳大利亚大奖赛');
      expect(GP_TRANSLATIONS['Monaco Grand Prix']).toBe('摩纳哥大奖赛');
      expect(GP_TRANSLATIONS['British Grand Prix']).toBe('英国大奖赛');
    });

    it('should have translations for 2026 season races', () => {
      expect(GP_TRANSLATIONS['FORMULA 1 ARAMCO JAPANESE GRAND PRIX 2026']).toBe('一级方程式赛车阿美日本大奖赛');
    });
  });
});
