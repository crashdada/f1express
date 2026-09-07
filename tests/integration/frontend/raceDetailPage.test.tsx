import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import * as dynamicDataHook from '../../../src/hooks/useDynamic2026Data';
import RaceDetailPage from '../../../src/pages/RaceDetailPage';
import { renderWithRouter } from '../../support/render';

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: vi.fn(),
}));

const baseMockData = {
  schedule: [
    {
      round: 'Round 15',
      roundNumber: 15,
      country: 'Italy',
      gpName: 'Italian Grand Prix',
      dates: '04 - 06 SEP',
      slug: 'italy',
      flag: 'flag-ita.png',
      image: 'track-ita.svg',
      detailedImage: 'track-ita-detailed.webp',
      isTest: false,
      sessions: [],
      circuitSpecs: {},
    },
  ],
  drivers: [],
  teams: [],
  substitutes: [],
  liveDrivers: [],
  raceResults: [
    {
      round: 15,
      slug: 'italy',
      country: 'Italy',
      date: '2026-09-06',
      results: [
        { pos: 1, code: 'ANT', number: 12, firstName: 'Kimi', lastName: 'Antonelli', firstNameCn: 'Kimi', lastNameCn: 'Antonelli', team: 'Mercedes', teamCn: '梅赛德斯', points: 25, status: 'Finished' },
        { pos: 9, code: 'COL', number: 43, firstName: 'Franco', lastName: 'Colapinto', firstNameCn: 'Franco', lastNameCn: 'Colapinto', team: 'Alpine', teamCn: 'Alpine', points: 2, status: 'Finished' },
        {
          pos: 10,
          code: 'UNK',
          number: 22,
          firstName: 'Unknown',
          lastName: 'Substitute',
          firstNameCn: '未知',
          lastNameCn: '替补车手',
          team: 'Red Bull',
          teamCn: '红牛',
          points: 1,
          status: 'Finished',
          isSubstitute: true,
          replacesCode: 'TSU',
          replaceReason: 'promotion',
        },
        { pos: 11, code: 'BOR', number: 5, firstName: 'Gabriel', lastName: 'Bortoleto', firstNameCn: 'Gabriel', lastNameCn: 'Bortoleto', team: 'Audi', teamCn: '奥迪', points: 0, status: 'Finished' },
      ],
    },
  ],
  loading: false,
  error: null,
};

describe('RaceDetailPage', () => {
  beforeEach(() => {
    vi.mocked(dynamicDataHook.useDynamic2026Data).mockReturnValue(baseMockData as any);
  });

  it('renders the substitute badge for marked substitute drivers', async () => {
    renderWithRouter(<RaceDetailPage />, ['/new-season/race/italy'], '/new-season/race/:slug');

    const badge = await screen.findByTestId('substitute-badge-UNK');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/替补/);
    expect(badge.textContent).toMatch(/TSU/);
  });

  it('does not render a substitute badge for non-substitute rows', async () => {
    renderWithRouter(<RaceDetailPage />, ['/new-season/race/italy'], '/new-season/race/:slug');

    await screen.findByTestId('substitute-badge-UNK');

    expect(screen.queryByTestId('substitute-badge-ANT')).toBeNull();
    expect(screen.queryByTestId('substitute-badge-COL')).toBeNull();
    expect(screen.queryByTestId('substitute-badge-BOR')).toBeNull();
  });
});
