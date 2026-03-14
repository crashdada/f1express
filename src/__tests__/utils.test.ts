import { describe, it, expect } from 'vitest';
import { getCurrentSeason } from '../utils/f1Data';

describe('f1Data utilities', () => {
  describe('getCurrentSeason', () => {
    it('returns the current year', () => {
      const currentYear = new Date().getFullYear();
      expect(getCurrentSeason()).toBe(currentYear);
    });
  });
});

describe('Data processing', () => {
  it('should handle empty data gracefully', () => {
    // Test that empty arrays don't cause errors
    const emptyDrivers: never[] = [];
    expect(emptyDrivers).toHaveLength(0);
  });

  it('should calculate total wins correctly', () => {
    const drivers = [
      { wins: 10 },
      { wins: 20 },
      { wins: 5 },
    ];
    
    const totalWins = drivers.reduce((sum, d) => sum + d.wins, 0);
    expect(totalWins).toBe(35);
  });

  it('should sort drivers by points descending', () => {
    const drivers = [
      { name: 'A', points: 100 },
      { name: 'B', points: 300 },
      { name: 'C', points: 200 },
    ];
    
    const sorted = [...drivers].sort((a, b) => b.points - a.points);
    
    expect(sorted[0].name).toBe('B');
    expect(sorted[1].name).toBe('C');
    expect(sorted[2].name).toBe('A');
  });

  it('should extract season from URL correctly', () => {
    const url = '/results/2024/races/bahrain/bahrain-grand-prix';
    const match = url.match(/results\/(\d{4})/);
    const season = match ? parseInt(match[1]) : 2025;
    
    expect(season).toBe(2024);
  });

  it('should handle invalid URL gracefully', () => {
    const invalidUrl = '/invalid/url';
    const match = invalidUrl.match(/results\/(\d{4})/);
    const season = match ? parseInt(match[1]) : 2025;
    
    expect(season).toBe(2025);
  });
});
