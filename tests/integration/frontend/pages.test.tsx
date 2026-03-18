import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../../../src/pages/HomePage';
import DriversPage from '../../../src/pages/DriversPage';
import TeamsPage from '../../../src/pages/TeamsPage';
import RacesPage from '../../../src/pages/RacesPage';
import { renderWithProviders } from '../../support/render';

vi.mock('../../../src/components/RaceCountdown', () => ({
  default: () => <div data-testid="race-countdown">Next race countdown</div>,
}));

vi.mock('../../../src/hooks/useCombinedData', () => ({
  useCombinedData: () => ({
    combinedTeams: [
      {
        id: 'mclaren',
        name: 'McLaren',
        fullName: 'McLaren Formula 1 Team',
        nameCn: 'McLaren',
        points: 150,
        wins: 4,
        podiums: 8,
        poles: 3,
        championships: 8,
        driverChampionships: 12,
        color: '#ff8000',
      },
      {
        id: 'ferrari',
        name: 'Ferrari',
        fullName: 'Scuderia Ferrari',
        nameCn: 'Ferrari',
        points: 120,
        wins: 2,
        podiums: 6,
        poles: 1,
        championships: 16,
        driverChampionships: 15,
        color: '#dc0000',
      },
    ],
    combinedDrivers: [
      {
        id: 44,
        number: 44,
        firstName: 'Lewis',
        lastName: 'Hamilton',
        firstNameCn: 'Lewis',
        lastNameCn: 'Hamilton',
        code: 'HAM',
        team: 'Ferrari',
        nationality: 'British',
        points: 100,
        wins: 2,
        podiums: 5,
        poles: 1,
        championships: 7,
      },
      {
        id: 4,
        number: 4,
        firstName: 'Lando',
        lastName: 'Norris',
        firstNameCn: 'Lando',
        lastNameCn: 'Norris',
        code: 'NOR',
        team: 'McLaren',
        nationality: 'British',
        points: 120,
        wins: 3,
        podiums: 6,
        poles: 2,
        championships: 0,
      },
    ],
    liveResults: [],
    loading: false,
  }),
}));

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: () => ({
    schedule: [
      {
        round: '1',
        country: 'Bahrain',
        gpName: 'Bahrain Grand Prix',
        dates: '28 FEB - 02 MAR',
        slug: 'bahrain',
      },
    ],
    drivers: [],
    teams: [],
    raceResults: [
      {
        round: 1,
        country: 'Bahrain',
        slug: 'bahrain',
        date: '2026-03-02',
        results: [
          {
            pos: 1,
            firstName: 'Lando',
            lastName: 'Norris',
            firstNameCn: 'Lando',
            lastNameCn: 'Norris',
            code: 'NOR',
            number: 4,
            team: 'McLaren',
            teamCn: 'McLaren',
            points: 25,
            status: 'Finished',
          },
        ],
      },
    ],
    loading: false,
    error: null,
  }),
}));

describe('HomePage', () => {
  it('renders the homepage modules and leaderboard links', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByTestId('race-countdown')).toBeInTheDocument();
    expect(screen.getAllByText('Lewis Hamilton').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lando Norris').length).toBeGreaterThan(0);
    expect(screen.getAllByText('McLaren').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ferrari').length).toBeGreaterThan(0);

    const leaderboardLinks = screen.getAllByRole('link', { name: /查看更多/ });
    expect(leaderboardLinks).toHaveLength(2);
    expect(leaderboardLinks[0]).toHaveAttribute('href', '/drivers');
    expect(leaderboardLinks[1]).toHaveAttribute('href', '/teams');
  });
});

describe('DriversPage', () => {
  it('renders the driver directory and search controls', () => {
    renderWithProviders(<DriversPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索车手姓名、代码或车队...')).toBeInTheDocument();
    expect(screen.getAllByText('Lewis Hamilton').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lando Norris').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(7);
  });

  it('updates the search query from user input', async () => {
    renderWithProviders(<DriversPage />);
    const searchInput = screen.getByPlaceholderText('搜索车手姓名、代码或车队...');

    await userEvent.type(searchInput, 'Hamilton');

    expect(searchInput).toHaveValue('Hamilton');
  });
});

describe('TeamsPage', () => {
  it('renders team summary cards and standings rows', () => {
    renderWithProviders(<TeamsPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('McLaren').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ferrari').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('row').length).toBeGreaterThan(2);
  });
});

describe('RacesPage', () => {
  it('renders the merged 2026 race results and search controls', async () => {
    renderWithProviders(<RacesPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText('搜索赛道、国家或车手...');
    expect(searchInput).toBeInTheDocument();
    expect(screen.getAllByText('2026').length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Bahrain/).length).toBeGreaterThan(1);
    expect(screen.getByText(/Norris/)).toBeInTheDocument();

    await userEvent.type(searchInput, 'Bahrain');

    expect(searchInput).toHaveValue('Bahrain');
  });
});
