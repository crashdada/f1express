import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewSeasonPage from '../../../src/pages/NewSeasonPage';
import * as dynamicDataHook from '../../../src/hooks/useDynamic2026Data';
import { renderWithRouter } from '../../support/render';

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: vi.fn(),
}));

const mockData = {
  schedule: [
    {
      round: 'Round 1',
      roundNumber: 1,
      country: 'Australia',
      gpName: 'Australian Grand Prix',
      dates: '06 - 08 MAR',
      slug: 'australia',
      flag: 'flag-aus.png',
      image: 'track-aus.svg',
    },
    {
      round: 'Round 2',
      roundNumber: 2,
      country: 'China',
      gpName: 'Chinese Grand Prix',
      dates: '20 - 22 MAR',
      slug: 'china',
      flag: 'flag-chn.png',
      image: 'track-chn.svg',
      status: 'CANCELLED',
    },
    {
      round: 'Round 3',
      roundNumber: 3,
      country: 'Japan',
      gpName: 'Japanese Grand Prix',
      dates: '03 - 05 APR',
      slug: 'japan',
      flag: 'flag-jpn.png',
      image: 'track-jpn.svg',
    },
  ],
  drivers: [
    { code: 'RUS', lastNameCn: '拉塞尔', image: 'rus.png', team: 'Mercedes' },
    { code: 'ANT', lastNameCn: '瀹変笢鍐呭埄', image: 'ant.png', team: 'Mercedes' },
    { code: 'LEC', lastNameCn: '勒克莱尔', image: 'lec.png', team: 'Ferrari' },
  ],
  teams: [
    {
      id: 'mercedes',
      name: 'Mercedes',
      nameCn: '梅赛德斯',
      color: '#27f4d2',
      logo: '/logos/mercedes.png',
      drivers: ['RUS', 'ANT'],
      carImage: '',
      engine: 'Mercedes',
      engineCn: '梅赛德斯',
      base: 'Brackley',
      baseCn: '布拉克利',
    },
    {
      id: 'ferrari',
      name: 'Ferrari',
      nameCn: '法拉利',
      color: '#e8002d',
      logo: '/logos/ferrari.png',
      drivers: ['LEC'],
      carImage: '',
      engine: 'Ferrari',
      engineCn: '法拉利',
      base: 'Maranello',
      baseCn: '马拉内罗',
    },
  ],
  raceResults: [
    {
      round: 1,
      slug: 'australia',
      results: [
        { pos: 1, code: 'RUS', team: 'Mercedes', teamCn: '梅赛德斯', points: 25, status: 'Finished' },
        { pos: 2, code: 'ANT', team: 'Mercedes', teamCn: '梅赛德斯', points: 18, status: '+5.515' },
        { pos: 3, code: 'LEC', team: 'Ferrari', teamCn: '法拉利', points: 15, status: '+15.200' },
      ],
      sprintResults: [
        { pos: 1, code: 'RUS', team: 'Mercedes', teamCn: '梅赛德斯', points: 8, status: 'Finished' },
        { pos: 2, code: 'LEC', team: 'Ferrari', teamCn: '法拉利', points: 7, status: '+1.000' },
      ],
    },
  ],
  loading: false,
  error: null,
};

describe('NewSeasonPage UI logic', () => {
  beforeEach(() => {
    vi.mocked(dynamicDataHook.useDynamic2026Data).mockReturnValue(mockData as any);
  });

  it('renders the finished race card with top 3 drivers', () => {
    renderWithRouter(<NewSeasonPage />);

    expect(screen.getByText('澳大利亚')).toBeInTheDocument();
    expect(screen.getByText('RUS')).toBeInTheDocument();
    expect(screen.getByText('ANT')).toBeInTheDocument();
    expect(screen.getByText('LEC')).toBeInTheDocument();
  });

  it('renders the next race card with localized next-race tag', () => {
    renderWithRouter(<NewSeasonPage />);

    expect(screen.getByText('日本')).toBeInTheDocument();
    expect(screen.getByText('\u4e0b\u4e00\u7ad9')).toBeInTheDocument();
  });

  it('renders a cancelled race with localized cancelled status', () => {
    renderWithRouter(<NewSeasonPage />);

    expect(screen.getByText('中国')).toBeInTheDocument();
    expect(screen.getByText('\u5df2\u53d6\u6d88')).toBeInTheDocument();
  });

  it('navigates to the correct deep link route for races', () => {
    renderWithRouter(<NewSeasonPage />);

    const japanLink = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/new-season/race/japan');

    expect(japanLink).toBeTruthy();
    expect(japanLink?.getAttribute('href')).toBe('/new-season/race/japan');
  });

  it('renders team logos in constructor leader and standings rows', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NewSeasonPage />);

    await user.click(screen.getByRole('button', { name: '积分榜' }));
    await user.click(screen.getByRole('button', { name: '车队榜' }));

    expect(screen.getByTestId('constructor-leader-logo')).toBeInTheDocument();
    expect(screen.getAllByTestId('team-standings-logo').length).toBeGreaterThan(0);
  });
});
