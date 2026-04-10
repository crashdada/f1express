import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import RaceCountdown from '../../../src/components/RaceCountdown';
import { renderWithRouter } from '../../support/render';

vi.mock('../../../src/hooks/useDynamic2026Data', () => ({
  useDynamic2026Data: vi.fn(),
}));

import { useDynamic2026Data } from '../../../src/hooks/useDynamic2026Data';

describe('RaceCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T08:00:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('skips cancelled races and shows the next valid grand prix', async () => {
    vi.mocked(useDynamic2026Data).mockReturnValue({
      schedule: [
        {
          round: '4',
          country: 'Bahrain',
          location: 'Sakhir',
          dates: '10 - 12 APR',
          status: 'CANCELLED',
          sessions: [{ name: 'Race', time: '2026-04-12T18:00:00+08:00' }],
        },
        {
          round: '5',
          country: 'Saudi Arabia',
          location: 'Jeddah',
          dates: '17 - 19 APR',
          status: 'UPCOMING',
          sessions: [{ name: 'Race', time: '2026-04-19T20:00:00+08:00' }],
        },
      ],
      loading: false,
      error: null,
      drivers: [],
      teams: [],
      raceResults: [],
    } as any);

    renderWithRouter(<RaceCountdown />);

    expect(screen.getByText(/Jeddah/)).toBeInTheDocument();
    expect(screen.getByText('17 - 19 APR')).toBeInTheDocument();
    expect(screen.queryByText(/Sakhir/)).not.toBeInTheDocument();
  });
});
