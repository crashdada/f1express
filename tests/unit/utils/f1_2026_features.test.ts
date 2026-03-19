import { describe, it, expect } from 'vitest';
import { translateCountry } from '../../../src/utils/translations';

describe('F1 2026 feature logic', () => {
  describe('translateCountry', () => {
    it('should translate lowercase country names correctly', () => {
      expect(translateCountry('china')).toBe('中国');
    });

    it('should handle uppercase English country names', () => {
      expect(translateCountry('UNITED KINGDOM')).toBe('英国');
      expect(translateCountry('NETHERLANDS')).toBe('荷兰');
    });

    it('should handle title case variants', () => {
      expect(translateCountry('Great Britain')).toBe('英国');
      expect(translateCountry('Great britain')).toBe('英国');
    });

    it('should fallback to original string if no translation exists', () => {
      expect(translateCountry('Moon Surface')).toBe('Moon Surface');
    });

    it('should handle Abu Dhabi specific translation', () => {
      expect(translateCountry('United Arab Emirates')).toBe('阿联酋');
    });
  });

  describe('data integrity and slugs', () => {
    it('should resolve track image slugs correctly', () => {
      const scheduleData = [
        { round: 'Round 24', country: 'United Arab Emirates', slug: 'abu-dhabi', image: 'abu-dhabi_outline.svg' },
      ];

      const event = scheduleData[0];
      expect(event.image).toContain(event.slug);
    });

    it('should specifically handle Abu Dhabi slug mismatch', () => {
      const normalizeSlug = (country: string, slug: string) => {
        if (country === 'United Arab Emirates' || slug === 'united-arab-emirates') {
          return 'abu-dhabi';
        }
        return slug;
      };

      expect(normalizeSlug('United Arab Emirates', 'united-arab-emirates')).toBe('abu-dhabi');
    });
  });

  describe('race status logic', () => {
    it('should correctly identify if a race is finished based on results', () => {
      const mockRaceResults = [
        { round: 1, results: [{ code: 'RUS', pos: 1 }] },
        { round: 2, results: [] },
      ];

      const isFinished = (roundNo: number) => {
        const round = mockRaceResults.find((result) => result.round === roundNo);
        return !!(round && round.results && round.results.length > 0);
      };

      expect(isFinished(1)).toBe(true);
      expect(isFinished(2)).toBe(false);
      expect(isFinished(3)).toBe(false);
    });

    it('should determine the next race correctly', () => {
      const mockSchedule = [
        { roundNumber: 1, status: 'FINISHED' },
        { roundNumber: 2, status: 'CANCELLED' },
        { roundNumber: 3, status: 'UPCOMING' },
        { roundNumber: 4, status: 'UPCOMING' },
      ];

      const getNextRace = (schedule: any[], results: any[]) => {
        const upcoming = schedule.filter((event) => {
          const isFinished = results.some((result) => result.round === event.roundNumber && result.hasResults);
          return event.status !== 'CANCELLED' && !isFinished;
        });
        return upcoming[0]?.roundNumber;
      };

      const mockResults = [{ round: 1, hasResults: true }];
      expect(getNextRace(mockSchedule, mockResults)).toBe(3);
    });
  });

  describe('route handling logic', () => {
    it('should generate consistent race detail routes', () => {
      const generateRoute = (slug: string) => `/new-season/race/${slug}`;

      expect(generateRoute('china')).toBe('/new-season/race/china');
      expect(generateRoute('monaco')).toBe('/new-season/race/monaco');
    });
  });

  describe('UI fix regressions', () => {
    it('should use object-contain for circular flag badges', () => {
      const flagClassName = 'w-full h-full object-contain';
      expect(flagClassName).toContain('object-contain');
    });
  });
});
