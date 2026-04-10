import { ProcessedDriverData } from '../types';
import {
  getCachedDb,
  getCachedDbMeta,
  resetCachedDb,
  resetCachedDbMeta,
  saveDbMeta,
  saveDbToCache,
  shouldRefreshCachedDb,
} from './f1-data/cache';
import { DB_NAME } from './f1-data/constants';
import { getCurrentSeason, getDriverDisplayName, getTeamDisplayName } from './f1-data/formatters';
import {
  DRIVER_CHAMPIONSHIPS_QUERY,
  RACE_INFO_QUERY,
  RACE_RESULTS_QUERY,
  SEASON_STATS_QUERY,
  buildTeamsQuery,
  buildDriversQuery,
} from './f1-data/queries';
import {
  convertQueryToData,
  mergeDynamicRaceResults,
  processDrivers,
  processRaceInfo,
  processRaceResults,
  processSeasonStats,
  processTeams,
} from './f1-data/processors';
import { loadPhotosIndex, loadSeason2026Data } from './f1-data/season2026';

let dbInitialized = false;
const REQUIRED_TABLES = ['drivers', 'teams', 'races'] as const;

async function fetchFirstAvailable(paths: string[]) {
  let lastStatus: number | null = null;
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (response.ok) {
        return response;
      }
      lastStatus = response.status;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`Failed to fetch resource: ${lastStatus ?? 'network error'}`);
}

function getDatabaseCandidates() {
  const timestamp = Date.now();
  const packagedDb = `/f1.db?t=${timestamp}`;
  const mappedDb = `/data/f1.db?t=${timestamp}`;
  const isNative =
    typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return isNative || !isLocalDev ? [packagedDb, mappedDb] : [mappedDb, packagedDb];
}

function hasRequiredTables(db: any) {
  try {
    const result = db.exec(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${REQUIRED_TABLES.map((name) => `'${name}'`).join(', ')})`
    );
    const rows = convertQueryToData(result);
    const tableNames = new Set(rows.map((row) => String(row.name)));
    return REQUIRED_TABLES.every((name) => tableNames.has(name));
  } catch {
    return false;
  }
}

async function getRemoteDbMeta() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.database?.sizeBytes || !data?.database?.modifiedAt) {
      return null;
    }

    return {
      sizeBytes: Number(data.database.sizeBytes),
      modifiedAt: String(data.database.modifiedAt),
      appVersion: data.appVersion ? String(data.appVersion) : undefined,
    };
  } catch {
    return null;
  }
}

async function getRouteDbMeta() {
  const candidates = getDatabaseCandidates().map((candidate) => candidate.split('?')[0]);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const sizeHeader = response.headers.get('content-length');
      const modifiedAt = response.headers.get('last-modified') || response.headers.get('date');
      const etag = response.headers.get('etag') || undefined;

      if (!sizeHeader || !modifiedAt) {
        continue;
      }

      return {
        sizeBytes: Number(sizeHeader),
        modifiedAt,
        etag,
      };
    } catch {
      // Try the next candidate route
    }
  }

  return null;
}

async function ensureDatabase() {
  if (dbInitialized) {
    return (window as any).f1Db;
  }

  const initSqlJs = (window as any).initSqlJs;
  if (!initSqlJs) {
    throw new Error('sql.js not loaded');
  }

  const SQL = (await initSqlJs({
    locateFile: (file: string) => `/libs/sql.js/${file}`,
  })) as any;

  const remoteMeta = (await getRemoteDbMeta()) || (await getRouteDbMeta());
  const cachedMeta = getCachedDbMeta();
  let buffer: Uint8Array | null = await getCachedDb();

  const missingMetaForCachedDb = Boolean(buffer && remoteMeta && !cachedMeta);
  if (missingMetaForCachedDb || shouldRefreshCachedDb(cachedMeta, remoteMeta)) {
    console.log('Database metadata changed, clearing stale IndexedDB cache.');
    resetCachedDb();
    resetCachedDbMeta();
    buffer = null;
  }

  if (buffer) {
    const cachedDb = new SQL.Database(buffer);
    const isValidCachedDb = hasRequiredTables(cachedDb);
    cachedDb.close();

    if (!isValidCachedDb) {
      console.warn('Cached database is incompatible, clearing IndexedDB cache.');
      resetCachedDb();
      resetCachedDbMeta();
      buffer = null;
    }
  }

  if (buffer) {
    console.log('Using cached database from IndexedDB, size:', buffer.byteLength);
    if (remoteMeta && !cachedMeta) {
      saveDbMeta(remoteMeta);
    }
  } else {
    console.log('Fetching database from preferred route...');
    const candidates = getDatabaseCandidates();
    let validatedBuffer: Uint8Array | null = null;

    for (const candidate of candidates) {
      const response = await fetchFirstAvailable([candidate]);
      const arrayBuffer = await response.arrayBuffer();
      const nextBuffer = new Uint8Array(arrayBuffer);
      const candidateDb = new SQL.Database(nextBuffer);

      if (hasRequiredTables(candidateDb)) {
        validatedBuffer = nextBuffer;
        candidateDb.close();
        console.log('Using database source:', candidate);
        break;
      }

      candidateDb.close();
      console.warn('Skipping incompatible database source:', candidate);
    }

    if (!validatedBuffer) {
      throw new Error('未找到包含 drivers/teams/races 表的有效数据库');
    }

    buffer = validatedBuffer;
    await saveDbToCache(buffer);

    if (remoteMeta) {
      saveDbMeta(remoteMeta);
    }
  }

  const db = new SQL.Database(buffer);
  (window as any).f1Db = db;
  dbInitialized = true;
  return db;
}

function safeExec(db: any, sql: string) {
  try {
    return db.exec(sql);
  } catch (error: any) {
    if (error.message?.includes('malformed') || error.toString().includes('malformed')) {
      resetCachedDb();
      resetCachedDbMeta();
      window.location.reload();
    }

    throw error;
  }
}

function getTableColumns(db: any, tableName: string) {
  const result = safeExec(db, `PRAGMA table_info(${tableName})`);
  const columns = new Set<string>();

  for (const row of convertQueryToData(result)) {
    if (row.name) {
      columns.add(String(row.name));
    }
  }

  return columns;
}

export const loadF1Data = async (): Promise<ProcessedDriverData> => {
  try {
    const db = await ensureDatabase();
    const driverColumns = getTableColumns(db, 'drivers');
    const teamColumns = getTableColumns(db, 'teams');
    const driversQuery = safeExec(db, buildDriversQuery(driverColumns));
    const teamsQuery = safeExec(db, buildTeamsQuery(teamColumns));
    const raceResultsQuery = safeExec(db, RACE_RESULTS_QUERY);
    const driverChampionshipsQuery = safeExec(db, DRIVER_CHAMPIONSHIPS_QUERY);
    const raceInfoQuery = safeExec(db, RACE_INFO_QUERY);
    const seasonStatsQuery = safeExec(db, SEASON_STATS_QUERY);

    const photosIndex = await loadPhotosIndex();

    let season2026Data = {
      schedule: [],
      results2026: [],
      drivers2026: [],
      teams2026: [],
    };

    try {
      season2026Data = await loadSeason2026Data();
    } catch (error) {
      console.warn('Failed to load 2026 data', error);
    }

    const driversData = convertQueryToData(driversQuery);
    const teamsData = convertQueryToData(teamsQuery);
    const raceResultsData = convertQueryToData(raceResultsQuery);
    const raceInfoData = convertQueryToData(raceInfoQuery);
    const seasonStatsData = convertQueryToData(seasonStatsQuery);
    const driverChampionshipsData = convertQueryToData(driverChampionshipsQuery);

    const drivers = processDrivers(
      driversData,
      photosIndex,
      season2026Data.drivers2026,
      season2026Data.teams2026
    );
    const teams = processTeams(teamsData, season2026Data.teams2026);
    const raceResults = mergeDynamicRaceResults(
      drivers,
      processRaceResults(raceResultsData),
      season2026Data.results2026
    );

    return {
      drivers,
      raceResults,
      teams,
      seasonStats: processSeasonStats(seasonStatsData),
      schedule: season2026Data.schedule,
      raceInfo: processRaceInfo(raceInfoData),
      photosIndex,
      driverChampionships: driverChampionshipsData.map((item: any) => ({
        driverId: item.driver_id,
        season: item.season,
        rank: item.rank,
      })),
    };
  } catch (error) {
    console.error('Error loading F1 data:', error);
    throw error instanceof Error ? error : new Error('加载 F1 数据失败');
  }
};

export { DB_NAME, getCurrentSeason, getDriverDisplayName, getTeamDisplayName };
