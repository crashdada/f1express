import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cacheMocks = vi.hoisted(() => ({
  getCachedDb: vi.fn(),
  getCachedDbMeta: vi.fn(),
  resetCachedDb: vi.fn(),
  resetCachedDbMeta: vi.fn(),
  saveDbMeta: vi.fn(),
  saveDbToCache: vi.fn(),
  shouldRefreshCachedDb: vi.fn(),
}));

const seasonMocks = vi.hoisted(() => ({
  loadPhotosIndex: vi.fn(),
  loadSeason2026Data: vi.fn(),
}));

vi.mock('../../../src/utils/f1-data/cache', () => cacheMocks);
vi.mock('../../../src/utils/f1-data/season2026', () => seasonMocks);

type RouteKey = 'root' | 'data';

const REQUIRED_TABLE_ROWS = {
  columns: ['name'],
  values: [['drivers'], ['teams'], ['races']],
};

const DRIVER_TABLE_COLUMNS = {
  columns: ['name'],
  values: [['driver_id'], ['first_name'], ['last_name'], ['code'], ['team_name']],
};

function createDbBuffer(marker: number) {
  return Uint8Array.from([marker]).buffer;
}

function createSqlJsMock(validity: Partial<Record<RouteKey, boolean>>) {
  class MockDatabase {
    private readonly marker: number;

    constructor(buffer: Uint8Array) {
      this.marker = buffer[0] ?? 0;
    }

    exec(sql: string) {
      if (sql.includes('sqlite_master')) {
        const isRoot = this.marker === 1;
        const isData = this.marker === 2;
        const isValid = (isRoot && validity.root) || (isData && validity.data);
        return isValid ? [REQUIRED_TABLE_ROWS] : [];
      }

      if (sql.includes('PRAGMA table_info(drivers)')) {
        return [DRIVER_TABLE_COLUMNS];
      }

      return [];
    }

    close() {
      return undefined;
    }
  }

  return vi.fn(async () => ({
    Database: MockDatabase,
  }));
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/health')) {
      throw new Error('api unavailable');
    }

    if (url.includes('/data/f1.db')) {
      return {
        ok: true,
        arrayBuffer: async () => createDbBuffer(2),
      } as Response;
    }

    if (url.includes('/f1.db')) {
      return {
        ok: true,
        arrayBuffer: async () => createDbBuffer(1),
      } as Response;
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
}

async function loadF1DataModule() {
  return import('../../../src/utils/f1Data');
}

function getDbFetchCalls() {
  return vi
    .mocked(global.fetch)
    .mock.calls.filter(([url, init]) => String(url).includes('.db') && init?.method !== 'HEAD')
    .map(([url]) => String(url));
}

describe('f1Data utils', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', createFetchMock());
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => ({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      })),
      deleteDatabase: vi.fn(),
    });
    vi.stubGlobal('location', { hostname: 'localhost' });

    cacheMocks.getCachedDb.mockResolvedValue(null);
    cacheMocks.getCachedDbMeta.mockReturnValue(null);
    cacheMocks.resetCachedDb.mockImplementation(() => undefined);
    cacheMocks.resetCachedDbMeta.mockImplementation(() => undefined);
    cacheMocks.saveDbMeta.mockImplementation(() => undefined);
    cacheMocks.saveDbToCache.mockResolvedValue(undefined);
    cacheMocks.shouldRefreshCachedDb.mockReturnValue(false);

    seasonMocks.loadPhotosIndex.mockResolvedValue([]);
    seasonMocks.loadSeason2026Data.mockResolvedValue({
      schedule: [],
      results2026: [],
      drivers2026: [],
      teams2026: [],
    });

    (window as any).Capacitor = undefined;
    delete (window as any).f1Db;
    delete (window as any).initSqlJs;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('getDriverDisplayName', () => {
    it('should return Chinese name format if cn fields are present', async () => {
      const { getDriverDisplayName } = await loadF1DataModule();
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
        firstNameCn: '兰多',
        lastNameCn: '诺里斯',
      };
      expect(getDriverDisplayName(driver)).toBe('诺里斯兰多');
    });

    it('should return English name format if cn fields are missing', async () => {
      const { getDriverDisplayName } = await loadF1DataModule();
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
      };
      expect(getDriverDisplayName(driver)).toBe('Lando Norris');
    });

    it('should return English name format if partial cn fields are missing', async () => {
      const { getDriverDisplayName } = await loadF1DataModule();
      const driver = {
        firstName: 'Lando',
        lastName: 'Norris',
        firstNameCn: '兰多',
      };
      expect(getDriverDisplayName(driver)).toBe('Lando Norris');
    });

    it('should handle empty strings as missing', async () => {
      const { getDriverDisplayName } = await loadF1DataModule();
      const driver = {
        firstName: 'Max',
        lastName: 'Verstappen',
        firstNameCn: '',
        lastNameCn: '',
      };
      expect(getDriverDisplayName(driver)).toBe('Max Verstappen');
    });
  });

  describe('getCurrentSeason', () => {
    it('should return the current year', async () => {
      const { getCurrentSeason } = await loadF1DataModule();
      const currentYear = new Date().getFullYear();
      expect(getCurrentSeason()).toBe(currentYear);
    });

    it('should return a valid year number', async () => {
      const { getCurrentSeason } = await loadF1DataModule();
      const season = getCurrentSeason();
      expect(typeof season).toBe('number');
      expect(season).toBeGreaterThanOrEqual(2026);
      expect(season).toBeLessThan(2030);
    });
  });

  describe('getTeamDisplayName', () => {
    it('should return Chinese name if available', async () => {
      const { getTeamDisplayName } = await loadF1DataModule();
      const team = {
        name: 'Ferrari',
        nameCn: '法拉利',
      };
      expect(getTeamDisplayName(team)).toBe('法拉利');
    });

    it('should return fullName if cn is missing', async () => {
      const { getTeamDisplayName } = await loadF1DataModule();
      const team = {
        name: 'Ferrari',
        fullName: 'Scuderia Ferrari',
      };
      expect(getTeamDisplayName(team)).toBe('Scuderia Ferrari');
    });

    it('should return name if both cn and fullName are missing', async () => {
      const { getTeamDisplayName } = await loadF1DataModule();
      const team = {
        name: 'Ferrari',
      };
      expect(getTeamDisplayName(team)).toBe('Ferrari');
    });

    it('should prefer cn over fullName', async () => {
      const { getTeamDisplayName } = await loadF1DataModule();
      const team = {
        name: 'Red Bull',
        fullName: 'Red Bull Racing',
        nameCn: '红牛',
      };
      expect(getTeamDisplayName(team)).toBe('红牛');
    });
  });

  describe('loadF1Data', () => {
    it('should throw when sql.js is not loaded', async () => {
      const { loadF1Data } = await loadF1DataModule();
      await expect(loadF1Data()).rejects.toThrow('sql.js not loaded');
    });

    it('should prefer /data/f1.db on localhost web', async () => {
      const { loadF1Data } = await loadF1DataModule();
      (window as any).initSqlJs = createSqlJsMock({ data: true });

      await loadF1Data();

      const fetchCalls = getDbFetchCalls();
      expect(fetchCalls.some((url) => url.includes('/data/f1.db'))).toBe(true);
      expect(fetchCalls.some((url) => url.includes('/f1.db') && !url.includes('/data/f1.db'))).toBe(false);
    });

    it('should prefer /f1.db on native platform', async () => {
      const { loadF1Data } = await loadF1DataModule();
      (window as any).initSqlJs = createSqlJsMock({ root: true });
      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };
      vi.stubGlobal('location', { hostname: 'app.local' });

      await loadF1Data();

      const fetchCalls = getDbFetchCalls();
      expect(fetchCalls.some((url) => url.includes('/f1.db') && !url.includes('/data/f1.db'))).toBe(true);
      expect(fetchCalls.some((url) => url.includes('/data/f1.db'))).toBe(false);
    });

    it('should fall back to the alternate database when the first one is incompatible', async () => {
      const { loadF1Data } = await loadF1DataModule();
      (window as any).initSqlJs = createSqlJsMock({ root: false, data: true });
      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };
      vi.stubGlobal('location', { hostname: 'app.local' });

      await loadF1Data();

      const fetchCalls = getDbFetchCalls();
      expect(fetchCalls.some((url) => url.includes('/f1.db') && !url.includes('/data/f1.db'))).toBe(true);
      expect(fetchCalls.some((url) => url.includes('/data/f1.db'))).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Skipping incompatible database source:',
        expect.stringContaining('/f1.db')
      );
    });

    it('should clear incompatible cached database before fetching a fresh one', async () => {
      const { loadF1Data } = await loadF1DataModule();
      cacheMocks.getCachedDb.mockResolvedValue(new Uint8Array([9]));
      (window as any).initSqlJs = createSqlJsMock({ data: true });

      await loadF1Data();

      expect(cacheMocks.resetCachedDb).toHaveBeenCalled();
      expect(cacheMocks.resetCachedDbMeta).toHaveBeenCalled();
      expect(cacheMocks.saveDbToCache).toHaveBeenCalled();
    });
  });
});
