import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPhotosIndex, loadSeason2026Data, resetSeason2026DataCache } from '../../../src/utils/f1-data/season2026';
import { REMOTE_DATA_BASE_URL } from '../../../src/utils/f1-data/constants';

function createJsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('season2026 data helpers', () => {
  beforeEach(() => {
    resetSeason2026DataCache();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('location', { hostname: 'f1express.app' });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    resetSeason2026DataCache();
    vi.restoreAllMocks();
  });

  it('keeps local race results when remote results are empty but prefers fresher remote metadata', async () => {
    const localSchedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1, country: `Local ${index + 1}` }));
    const remoteSchedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1, country: `Remote ${index + 1}` }));
    const localResults = [{ round: 1, results: [{ code: 'NOR', points: 25 }] }];
    const localDrivers = [{ code: 'NOR', firstName: 'Lando' }];
    const remoteDrivers = [{ code: 'NOR', firstName: 'Lando', updated: true }];
    const localTeams = [{ name: 'McLaren' }];
    const remoteTeams = [{ name: 'McLaren', updated: true }];

    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`${REMOTE_DATA_BASE_URL}/schedule_2026.json`)) return Promise.resolve(createJsonResponse(remoteSchedule));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/results_2026.json`)) return Promise.resolve(createJsonResponse([]));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/drivers_2026.json`)) return Promise.resolve(createJsonResponse(remoteDrivers));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/teams_2026.json`)) return Promise.resolve(createJsonResponse(remoteTeams));
      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(localSchedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(localResults));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(localDrivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(localTeams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const data = await loadSeason2026Data();

    expect(data.schedule[0]).toEqual(remoteSchedule[0]);
    expect(data.drivers2026[0]).toEqual(remoteDrivers[0]);
    expect(data.teams2026[0]).toEqual(remoteTeams[0]);
    expect(data.results2026).toEqual(localResults);
  });

  it('keeps local race results when remote results omit local sprint sessions', async () => {
    const schedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1, country: `Round ${index + 1}` }));
    const localResults = [
      {
        round: 2,
        slug: 'china',
        results: [{ code: 'RUS', points: 25 }],
        sprintResults: [{ code: 'RUS', points: 8 }],
      },
    ];
    const remoteResults = [
      {
        round: 2,
        slug: 'china',
        results: [{ code: 'RUS', points: 25 }],
        sprintResults: [],
      },
    ];
    const drivers = [{ code: 'RUS', firstName: 'George' }];
    const teams = [{ name: 'Mercedes' }];

    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`${REMOTE_DATA_BASE_URL}/schedule_2026.json`)) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/results_2026.json`)) return Promise.resolve(createJsonResponse(remoteResults));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/drivers_2026.json`)) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/teams_2026.json`)) return Promise.resolve(createJsonResponse(teams));
      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(localResults));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(teams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const data = await loadSeason2026Data();

    expect(data.results2026).toEqual(localResults);
  });

  it('merges local sprint results into richer remote race results when remote adds a new round', async () => {
    const schedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1, country: `Round ${index + 1}` }));
    const localResults = [
      {
        round: 1,
        slug: 'australia',
        results: [{ code: 'RUS', points: 25 }],
      },
      {
        round: 2,
        slug: 'china',
        results: [{ code: 'RUS', points: 25 }],
        sprintResults: [{ code: 'RUS', points: 8 }],
      },
    ];
    const remoteResults = [
      {
        round: 1,
        slug: 'australia',
        results: [{ code: 'RUS', points: 25 }],
      },
      {
        round: 2,
        slug: 'china',
        results: [{ code: 'RUS', points: 25 }],
        sprintResults: [],
      },
      {
        round: 3,
        slug: 'japan',
        results: [{ code: 'VER', points: 25 }],
      },
    ];
    const drivers = [{ code: 'RUS', firstName: 'George' }];
    const teams = [{ name: 'Mercedes' }];

    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`${REMOTE_DATA_BASE_URL}/schedule_2026.json`)) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/results_2026.json`)) return Promise.resolve(createJsonResponse(remoteResults));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/drivers_2026.json`)) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/teams_2026.json`)) return Promise.resolve(createJsonResponse(teams));
      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(localResults));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(teams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const data = await loadSeason2026Data();

    expect(data.results2026).toHaveLength(3);
    expect(data.results2026.find((round) => round.slug === 'japan')).toEqual(remoteResults[2]);
    expect(data.results2026.find((round) => round.slug === 'china')?.sprintResults).toEqual(localResults[1].sprintResults);
  });

  it('keeps local schedule status and dates when remote schedule clears them', async () => {
    const localSchedule = Array.from({ length: 20 }, (_, index) => ({
      round: `ROUND ${index + 1}`,
      slug: `round-${index + 1}`,
      dates: `${index + 1} - ${index + 3} APR`,
      sessions: [{ name: 'Race', time: '13:00' }],
      status: null,
    }));
    localSchedule[3] = {
      round: 'ROUND 4',
      slug: 'bahrain',
      dates: '10 - 12 APR',
      sessions: [],
      status: 'CANCELLED',
    };
    localSchedule[4] = {
      round: 'ROUND 5',
      slug: 'saudi-arabia',
      dates: '17 - 19 APR',
      sessions: [],
      status: 'CANCELLED',
    };
    localSchedule[5] = {
      round: 'ROUND 6',
      slug: 'miami',
      dates: '01 - 03 May',
      sessions: [{ name: 'Race', time: '13:00' }],
      status: null,
    };

    const remoteSchedule = structuredClone(localSchedule);
    remoteSchedule[3] = {
      ...remoteSchedule[3],
      status: null,
    };
    remoteSchedule[4] = {
      ...remoteSchedule[4],
      status: null,
      dates: null,
    };
    remoteSchedule[5] = {
      ...remoteSchedule[5],
      dates: null,
    };

    const results = [{ round: 1, results: [] }];
    const drivers = [{ code: 'NOR' }];
    const teams = [{ name: 'McLaren' }];

    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`${REMOTE_DATA_BASE_URL}/schedule_2026.json`)) return Promise.resolve(createJsonResponse(remoteSchedule));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/results_2026.json`)) return Promise.resolve(createJsonResponse(results));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/drivers_2026.json`)) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/teams_2026.json`)) return Promise.resolve(createJsonResponse(teams));
      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(localSchedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(results));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(teams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const data = await loadSeason2026Data();

    expect(data.schedule.find((event) => event.slug === 'bahrain')?.status).toBe('CANCELLED');
    expect(data.schedule.find((event) => event.slug === 'saudi-arabia')?.status).toBe('CANCELLED');
    expect(data.schedule.find((event) => event.slug === 'saudi-arabia')?.dates).toBe('17 - 19 APR');
    expect(data.schedule.find((event) => event.slug === 'miami')?.dates).toBe('01 - 03 May');
  });

  it('reuses cached season data until forceRefresh is requested', async () => {
    const schedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1 }));
    const drivers = [{ code: 'NOR' }];
    const teams = [{ name: 'McLaren' }];
    const localResults = [{ round: 1, slug: 'australia', results: [] }];
    const remoteResults = [
      { round: 1, slug: 'australia', results: [] },
      { round: 2, slug: 'japan', results: [{ code: 'VER', points: 25 }] },
    ];

    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`${REMOTE_DATA_BASE_URL}/schedule_2026.json`)) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/results_2026.json`)) return Promise.resolve(createJsonResponse(remoteResults));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/drivers_2026.json`)) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes(`${REMOTE_DATA_BASE_URL}/teams_2026.json`)) return Promise.resolve(createJsonResponse(teams));
      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(localResults));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(teams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const first = await loadSeason2026Data();
    const second = await loadSeason2026Data();
    const refreshed = await loadSeason2026Data({ forceRefresh: true });

    expect(first).toBe(second);
    expect(refreshed).not.toBe(first);
    expect(first.results2026).toHaveLength(2);
    expect(first.results2026.find((round) => round.slug === 'japan')).toEqual(remoteResults[1]);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(16);
  });

  it('returns an empty photo index when the runtime asset is unavailable', async () => {
    vi.mocked(global.fetch).mockResolvedValue(createJsonResponse(null, false));

    await expect(loadPhotosIndex()).resolves.toEqual([]);
  });
});
