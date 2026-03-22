import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCombinedData } from '../../../src/hooks/useCombinedData';

vi.mock('../../../src/context/F1Context', () => ({
  useF1: vi.fn(),
}));

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: vi.fn(),
}));

import { useF1 } from '../../../src/context/F1Context';
import { useDynamic2026Data } from '../../../src/hooks/useDynamic2026Data';

describe('useCombinedData', () => {
  it('overlays 2026 live constructor totals onto historical team totals', () => {
    vi.mocked(useF1).mockReturnValue({
      state: {
        teams: [
          {
            id: 'ferrari',
            name: '法拉利',
            fullName: '法拉利',
            nameCn: '法拉利',
            points: 11521,
            wins: 248,
            podiums: 836,
            poles: 246,
            championships: 16,
            driverChampionships: 15,
            championshipYears: [],
            color: '#e10600',
            logo: '',
          },
        ],
        drivers: [],
        raceResults: [],
        schedule: [],
        raceInfo: [],
        loading: false,
        error: null,
        selectedDriver: null,
        selectedTeam: null,
        selectedSeason: null,
        searchQuery: '',
        viewMode: 'grid',
        theme: 'light',
        photosIndex: [],
        driverChampionships: [],
      },
      dispatch: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    vi.mocked(useDynamic2026Data).mockReturnValue({
      schedule: [],
      drivers: [],
      teams: [
        {
          id: 'ferrari-2026',
          name: 'Ferrari',
          nameCn: '法拉利',
          color: '#e10600',
          logo: '',
        },
      ],
      raceResults: [
        {
          round: 1,
          country: 'Australia',
          slug: 'australia',
          date: '2026-03-08',
          results: [
            { pos: 2, code: 'LEC', firstName: 'Charles', lastName: 'Leclerc', firstNameCn: '夏尔', lastNameCn: '勒克莱尔', number: 16, team: 'Ferrari', teamCn: '法拉利', points: 18, status: 'Finished' },
            { pos: 3, code: 'HAM', firstName: 'Lewis', lastName: 'Hamilton', firstNameCn: '刘易斯', lastNameCn: '汉密尔顿', number: 44, team: 'Ferrari', teamCn: '法拉利', points: 15, status: 'Finished' },
          ],
          sprintResults: [],
        },
        {
          round: 2,
          country: 'China',
          slug: 'china',
          date: '2026-03-22',
          results: [
            { pos: 4, code: 'LEC', firstName: 'Charles', lastName: 'Leclerc', firstNameCn: '夏尔', lastNameCn: '勒克莱尔', number: 16, team: 'Ferrari', teamCn: '法拉利', points: 12, status: 'Finished' },
            { pos: 7, code: 'HAM', firstName: 'Lewis', lastName: 'Hamilton', firstNameCn: '刘易斯', lastNameCn: '汉密尔顿', number: 44, team: 'Ferrari', teamCn: '法拉利', points: 6, status: 'Finished' },
          ],
          sprintResults: [
            { pos: 1, code: 'LEC', firstName: 'Charles', lastName: 'Leclerc', firstNameCn: '夏尔', lastNameCn: '勒克莱尔', number: 16, team: 'Ferrari', teamCn: '法拉利', points: 8, status: 'Finished' },
            { pos: 6, code: 'HAM', firstName: 'Lewis', lastName: 'Hamilton', firstNameCn: '刘易斯', lastNameCn: '汉密尔顿', number: 44, team: 'Ferrari', teamCn: '法拉利', points: 8, status: 'Finished' },
          ],
        },
      ],
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useCombinedData());
    const ferrari = result.current.combinedTeams.find((team) => team.nameCn === '法拉利');

    expect(ferrari?.points).toBe(11588);
    expect(ferrari?.wins).toBe(248);
    expect(ferrari?.podiums).toBe(838);
    expect(ferrari?.poles).toBe(246);
    expect(ferrari?.isActive2026).toBe(true);
  });

  it('matches live driver points by name before code when historical codes collide', () => {
    vi.mocked(useF1).mockReturnValue({
      state: {
        teams: [],
        drivers: [
          {
            id: 1923,
            firstName: 'Denny',
            lastName: 'Hulme',
            firstNameCn: '',
            lastNameCn: '',
            code: 'HUL',
            team: 'McLaren',
            nationality: 'New Zealand',
            points: 112,
            wins: 8,
            podiums: 33,
            poles: 1,
            championships: 1,
            championshipYears: [1967],
          },
          {
            id: 3672,
            firstName: 'Nico',
            lastName: 'Hulkenberg',
            firstNameCn: '尼科',
            lastNameCn: '霍肯伯格',
            code: 'HUL',
            team: 'Kick Sauber',
            nationality: 'Germany',
            points: 571,
            wins: 0,
            podiums: 1,
            poles: 1,
            championships: 0,
            championshipYears: [],
          },
        ],
        raceResults: [],
        schedule: [],
        raceInfo: [],
        loading: false,
        error: null,
        selectedDriver: null,
        selectedTeam: null,
        selectedSeason: null,
        searchQuery: '',
        viewMode: 'grid',
        theme: 'light',
        photosIndex: [],
        driverChampionships: [],
      },
      dispatch: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    vi.mocked(useDynamic2026Data).mockReturnValue({
      schedule: [],
      drivers: [
        {
          id: 'nico-hulkenberg',
          firstName: 'Nico',
          lastName: 'Hulkenberg',
          firstNameCn: '尼科',
          lastNameCn: '霍肯伯格',
          code: 'HUL',
          number: 27,
          team: 'Kick Sauber',
          teamCn: '索伯',
          country: 'Germany',
          image: '',
        },
      ],
      teams: [],
      raceResults: [
        {
          round: 1,
          country: 'Australia',
          slug: 'australia',
          date: '2026-03-08',
          results: [
            {
              pos: 6,
              code: 'HUL',
              firstName: 'Nico',
              lastName: 'Hulkenberg',
              firstNameCn: '尼科',
              lastNameCn: '霍肯伯格',
              number: 27,
              team: 'Kick Sauber',
              teamCn: '索伯',
              points: 8,
              status: 'Finished',
            },
          ],
          sprintResults: [
            {
              pos: 7,
              code: 'HUL',
              firstName: 'Nico',
              lastName: 'Hulkenberg',
              firstNameCn: '尼科',
              lastNameCn: '霍肯伯格',
              number: 27,
              team: 'Kick Sauber',
              teamCn: '索伯',
              points: 2,
              status: 'Finished',
            },
          ],
          polePosition: undefined,
        },
      ],
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useCombinedData());
    const hulme = result.current.combinedDrivers.find((driver) => driver.id === 1923);
    const hulkenberg = result.current.combinedDrivers.find((driver) => driver.id === 3672);

    expect(hulme?.points).toBe(112);
    expect(hulkenberg?.points).toBe(581);
    expect(hulkenberg?.isActive2026).toBe(true);
  });
});
