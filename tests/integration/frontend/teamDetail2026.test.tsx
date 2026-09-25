import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import * as dynamicDataHook from '../../../src/hooks/useDynamic2026Data';
import TeamDetail2026 from '../../../src/pages/TeamDetail2026';
import { renderWithRouter } from '../../support/render';

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: vi.fn(),
}));

const teams = [
  {
    id: 'red_bull',
    name: 'Red Bull Racing',
    nameCn: '红牛',
    color: '#0600ef',
    logo: '',
    drivers: ['VER'],
    carImage: '',
    engine: 'Red Bull Ford',
    engineCn: '红牛福特',
    base: 'Milton Keynes',
    baseCn: '米尔顿凯恩斯',
  },
  {
    id: 'rb',
    name: 'Racing Bulls',
    nameCn: 'RB',
    color: '#6692ff',
    logo: '',
    drivers: ['LAW'],
    carImage: '',
    engine: 'Red Bull Ford',
    engineCn: '红牛福特',
    base: 'Faenza',
    baseCn: '法恩扎',
  },
];

const drivers = [
  {
    id: 'ver',
    code: 'VER',
    firstName: 'Max',
    lastName: 'Verstappen',
    firstNameCn: 'Max',
    lastNameCn: '维斯塔潘',
    number: 3,
    team: 'Red Bull',
    teamCn: '红牛',
    country: '',
    image: '',
  },
  {
    id: 'law',
    code: 'LAW',
    firstName: 'Liam',
    lastName: 'Lawson',
    firstNameCn: 'Liam',
    lastNameCn: '劳森',
    number: 30,
    team: 'Racing Bulls',
    teamCn: 'RB',
    country: '',
    image: '',
  },
];

const baseMockData = {
  schedule: [],
  drivers,
  teams,
  substitutes: [],
  liveDrivers: drivers,
  raceResults: [
    {
      round: 14,
      slug: 'spain',
      country: 'Spain',
      date: '2026-09-20',
      results: [
        {
          pos: 6,
          code: 'LAW',
          number: 30,
          firstName: 'Liam',
          lastName: 'Lawson',
          firstNameCn: 'Liam',
          lastNameCn: '劳森',
          team: 'Red Bull',
          teamCn: '红牛',
          points: 8,
          status: 'Finished',
        },
      ],
    },
  ],
  loading: false,
  error: null,
};

describe('TeamDetail2026 substitute points', () => {
  beforeEach(() => {
    vi.mocked(dynamicDataHook.useDynamic2026Data).mockReturnValue(baseMockData as any);
  });

  it('credits a substitute driver points to the team they raced for', () => {
    renderWithRouter(
      <TeamDetail2026 />,
      ['/new-season/team/red_bull'],
      '/new-season/team/:id'
    );

    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('does not credit the substitute points to their season team', () => {
    renderWithRouter(<TeamDetail2026 />, ['/new-season/team/rb'], '/new-season/team/:id');

    // Points, wins and podiums all render as 0 for Racing Bulls.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.queryByText('8')).not.toBeInTheDocument();
  });
});
