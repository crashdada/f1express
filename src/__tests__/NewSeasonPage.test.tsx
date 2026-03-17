import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NewSeasonPage from '../pages/NewSeasonPage';
import * as dynamicDataHook from '../hooks/useDynamic2026Data';

// Mock the hook
vi.mock('../hooks/useDynamic2026Data', () => ({
    useDynamic2026Data: vi.fn()
}));

const mockData = {
    schedule: [
        {
            round: "Round 1",
            roundNumber: 1,
            country: "Australia",
            gpName: "Australian Grand Prix",
            dates: "06 - 08 MAR",
            slug: "australia",
            flag: "flag-aus.png",
            image: "track-aus.svg"
        },
        {
            round: "Round 2",
            roundNumber: 2,
            country: "China",
            gpName: "Chinese Grand Prix",
            dates: "20 - 22 MAR",
            slug: "china",
            flag: "flag-chn.png",
            image: "track-chn.svg",
            status: "CANCELLED"
        },
        {
            round: "Round 3",
            roundNumber: 3,
            country: "Japan",
            gpName: "Japanese Grand Prix",
            dates: "03 - 05 APR",
            slug: "japan",
            flag: "flag-jpn.png",
            image: "track-jpn.svg"
        }
    ],
    drivers: [
        { code: "RUS", lastNameCn: "拉塞尔", image: "rus.png", team: "Mercedes" },
        { code: "ANT", lastNameCn: "安东内利", image: "ant.png", team: "Mercedes" },
        { code: "LEC", lastNameCn: "勒克莱尔", image: "lec.png", team: "Ferrari" }
    ],
    teams: [],
    raceResults: [
        {
            round: 1,
            slug: "australia",
            results: [
                { pos: 1, code: "RUS", status: "Finished" },
                { pos: 2, code: "ANT", status: "+5.515" },
                { pos: 3, code: "LEC", status: "+15.200" }
            ]
        }
    ],
    loading: false,
    error: null
};

describe('NewSeasonPage UI Logic', () => {
    beforeEach(() => {
        vi.mocked(dynamicDataHook.useDynamic2026Data).mockReturnValue(mockData as any);
    });

    it('renders the finished race card with top 3 drivers', () => {
        render(
            <BrowserRouter>
                <NewSeasonPage />
            </BrowserRouter>
        );

        expect(screen.getByText('澳大利亚')).toBeInTheDocument();
        // Check for top drivers codes
        expect(screen.getByText('RUS')).toBeInTheDocument();
        expect(screen.getByText('ANT')).toBeInTheDocument();
        expect(screen.getByText('LEC')).toBeInTheDocument();
    });

    it('renders the next race card with NEXT RACE tag', () => {
        // Round 1 is finished, Round 2 is cancelled, Round 3 should be "Next"
        render(
            <BrowserRouter>
                <NewSeasonPage />
            </BrowserRouter>
        );

        expect(screen.getByText('日本')).toBeInTheDocument();
        expect(screen.getByText('NEXT RACE')).toBeInTheDocument();
    });

    it('renders a cancelled race with CALLED OFF status', () => {
        render(
            <BrowserRouter>
                <NewSeasonPage />
            </BrowserRouter>
        );

        expect(screen.getByText('中国')).toBeInTheDocument();
        expect(screen.getByText('CALLED OFF')).toBeInTheDocument();
    });

    it('navigates to the correct deep link route for races', () => {
        render(
            <BrowserRouter>
                <NewSeasonPage />
            </BrowserRouter>
        );

        const japanLink = screen.getByRole('link', { name: /日本/i });
        expect(japanLink.getAttribute('href')).toBe('/new-season/race/japan');
    });
});
