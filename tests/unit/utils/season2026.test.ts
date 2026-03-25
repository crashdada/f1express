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

  it('reuses cached season data until forceRefresh is requested', async () => {
    const schedule = Array.from({ length: 20 }, (_, index) => ({ round: index + 1 }));
    const drivers = [{ code: 'NOR' }];
    const teams = [{ name: 'McLaren' }];
    const results = [{ round: 1, results: [] }];

    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/data/schedule_2026.json')) return Promise.resolve(createJsonResponse(schedule));
      if (url.includes('/data/results_2026.json')) return Promise.resolve(createJsonResponse(results));
      if (url.includes('/data/drivers_2026.json')) return Promise.resolve(createJsonResponse(drivers));
      if (url.includes('/data/teams_2026.json')) return Promise.resolve(createJsonResponse(teams));

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const first = await loadSeason2026Data();
    const second = await loadSeason2026Data();
    const refreshed = await loadSeason2026Data({ forceRefresh: true });

    expect(first).toBe(second);
    expect(refreshed).not.toBe(first);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(8);
  });

  it('returns an empty photo index when the runtime asset is unavailable', async () => {
    vi.mocked(global.fetch).mockResolvedValue(createJsonResponse(null, false));

    await expect(loadPhotosIndex()).resolves.toEqual([]);
  });
});
