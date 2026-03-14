import { describe, it, expect } from 'vitest';
import { getDriverDisplayName, getCurrentSeason, processSeasonStats } from './f1Data';

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
            // According to implementation, it requires BOTH firstNameCn and lastNameCn
            expect(getDriverDisplayName(driver)).toBe('Lando Norris');
        });
    });

    describe('getCurrentSeason', () => {
        it('should return the current year', () => {
            const currentYear = new Date().getFullYear();
            expect(getCurrentSeason()).toBe(currentYear);
        });
    });

    describe('processSeasonStats', () => {
        it('should correctly process raw season stats data', () => {
            const rawData = [
                { season: 2024, winner: 'Max Verstappen', team: 'Red Bull Racing', races: 24 },
                { season: 2023, winner: 'Max Verstappen', team: 'Red Bull Racing' } // Missing races
            ];

            const processed = (processSeasonStats as any)(rawData);

            expect(processed).toHaveLength(2);
            expect(processed[0]).toEqual({
                season: 2024,
                winner: 'Max Verstappen',
                team: 'Red Bull Racing',
                races: 24,
            });

            // Check default values
            expect(processed[1]).toEqual({
                season: 2023,
                winner: 'Max Verstappen',
                team: 'Red Bull Racing',
                races: 0,
            });
        });
    });
});
