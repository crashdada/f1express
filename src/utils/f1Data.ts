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
import { DB_NAME, EMPTY_PROCESSED_DATA } from './f1-data/constants';
import { getCurrentSeason, getDriverDisplayName, getTeamDisplayName } from './f1-data/formatters';
import {
  DRIVER_CHAMPIONSHIPS_QUERY,
  RACE_INFO_QUERY,
  RACE_RESULTS_QUERY,
  SEASON_STATS_QUERY,
  TEAMS_QUERY,
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

async function ensureDatabase() {
  if (dbInitialized) {
    return (window as any).f1Db;
  }

  const initSqlJs = (window as any).initSqlJs;
  if (!initSqlJs) {
    throw new Error('sql.js not loaded');
  }

  const SQL = await initSqlJs({
    locateFile: (file: string) => `/libs/sql.js/${file}`,
  }) as any;

  const remoteMeta = await getRemoteDbMeta();
  const cachedMeta = getCachedDbMeta();

  if (shouldRefreshCachedDb(cachedMeta, remoteMeta)) {
    console.log('Database metadata changed, clearing stale IndexedDB cache.');
    resetCachedDb();
    resetCachedDbMeta();
  }

  let buffer: Uint8Array | null = await getCachedDb();

  if (buffer) {
    console.log('Using cached database from IndexedDB, size:', buffer.byteLength);
  } else {
    console.log('Fetching database from /data/f1.db...');
    const response = await fetch(`/data/f1.db?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch database: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
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
    const driversQuery = safeExec(db, buildDriversQuery(driverColumns));
    const teamsQuery = safeExec(db, TEAMS_QUERY);
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
    return { ...EMPTY_PROCESSED_DATA };
  }
};

export { DB_NAME, getCurrentSeason, getDriverDisplayName, getTeamDisplayName };
