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
});
