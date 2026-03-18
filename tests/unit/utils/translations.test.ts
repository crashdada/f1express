import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_TRANSLATIONS,
  COUNTRY_TRANSLATIONS,
  TEAM_TRANSLATIONS,
  GP_TRANSLATIONS,
} from '../../../src/utils/translations';

describe('translations', () => {
  describe('CIRCUIT_TRANSLATIONS', () => {
    it('covers major historic circuits', () => {
      expect(CIRCUIT_TRANSLATIONS['Albert Park Grand Prix Circuit, Melbourne']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Bahrain International Circuit, Sakhir']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Circuit de Monaco, Monaco']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Silverstone Circuit, Silverstone']).toBeTruthy();
    });

    it('does not contain empty translation values', () => {
      const emptyTranslations = Object.entries(CIRCUIT_TRANSLATIONS).filter(
        ([, value]) => value === '' || value === undefined,
      );

      expect(emptyTranslations).toHaveLength(0);
    });

    it('keeps aliases for the same circuit populated', () => {
      expect(CIRCUIT_TRANSLATIONS['Albert Park Circuit']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Melbourne Grand Prix Circuit']).toBeTruthy();
    });

    it('covers modern venues added in recent seasons', () => {
      expect(CIRCUIT_TRANSLATIONS['Las Vegas Strip Circuit, Las Vegas']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Jeddah Corniche Circuit, Jeddah']).toBeTruthy();
      expect(CIRCUIT_TRANSLATIONS['Miami International Autodrome, Miami Gardens']).toBe('迈阿密国际赛车场');
    });
  });

  describe('COUNTRY_TRANSLATIONS', () => {
    it('covers the main F1 host countries', () => {
      expect(COUNTRY_TRANSLATIONS['Australia']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['United Kingdom']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['Italy']).toBeDefined();
      expect(COUNTRY_TRANSLATIONS['Germany']).toBeDefined();
    });

    it('does not contain empty values', () => {
      const emptyTranslations = Object.entries(COUNTRY_TRANSLATIONS).filter(([, value]) => value === '');

      expect(emptyTranslations).toHaveLength(0);
    });
  });

  describe('TEAM_TRANSLATIONS', () => {
    it('covers the main constructors', () => {
      expect(TEAM_TRANSLATIONS['Ferrari']).toBeTruthy();
      expect(TEAM_TRANSLATIONS['McLaren']).toBeTruthy();
      expect(TEAM_TRANSLATIONS['Mercedes']).toBeTruthy();
      expect(TEAM_TRANSLATIONS['Red Bull']).toBeTruthy();
    });

    it('falls back to the original value when a team is missing', () => {
      expect(TEAM_TRANSLATIONS['Unknown Team'] || 'Unknown Team').toBe('Unknown Team');
    });
  });

  describe('GP_TRANSLATIONS', () => {
    it('covers well-known grands prix', () => {
      expect(GP_TRANSLATIONS['Australian Grand Prix']).toBeTruthy();
      expect(GP_TRANSLATIONS['Monaco Grand Prix']).toBeTruthy();
      expect(GP_TRANSLATIONS['British Grand Prix']).toBeTruthy();
    });

    it('covers 2026 season race naming', () => {
      expect(GP_TRANSLATIONS['FORMULA 1 ARAMCO JAPANESE GRAND PRIX 2026']).toBeTruthy();
    });
  });
});
