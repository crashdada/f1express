import { z } from 'zod';
import { REMOTE_DATA_BASE_URL } from './constants';
import { ISubstituteDriver2026 } from '../../types';

const SubstituteDriverSchema = z.object({
  code: z.string(),
  number: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  firstNameCn: z.string(),
  lastNameCn: z.string(),
  team: z.string(),
  teamCn: z.string(),
  country: z.string().optional(),
  image: z.string().optional(),
  appearedRounds: z.array(z.number().int()).optional(),
});

const SubstituteRosterSchema = z.array(SubstituteDriverSchema);

type DatasetName =
  | 'schedule'
  | 'results2026'
  | 'drivers2026'
  | 'teams2026'
  | 'substitutes2026';

type CoreDatasetName = Exclude<DatasetName, 'substitutes2026'>;

const MIN_DATASET_LENGTH: Record<CoreDatasetName, number> = {
  schedule: 20,
  drivers2026: 1,
  teams2026: 1,
  results2026: 0,
};

const DATASET_LABELS: Record<DatasetName, string> = {
  schedule: 'Schedule',
  results2026: 'Results',
  drivers2026: 'Drivers',
  teams2026: 'Teams',
  substitutes2026: 'Substitutes',
};

const EMPTY_SUBSTITUTES: ISubstituteDriver2026[] = [];

export type Season2026Data = {
  schedule: unknown[];
  results2026: unknown[];
  drivers2026: unknown[];
  teams2026: unknown[];
  substitutes2026: ISubstituteDriver2026[];
};

function isValidCoreDataset(name: CoreDatasetName, value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.length >= MIN_DATASET_LENGTH[name];
}

function isValidDataset(name: CoreDatasetName, value: unknown): value is unknown[] {
  return isValidCoreDataset(name, value);
}

function parseSubstituteRoster(value: unknown): ISubstituteDriver2026[] {
  const result = SubstituteRosterSchema.safeParse(value);
  return result.success ? result.data : EMPTY_SUBSTITUTES;
}

function mergeSubstituteRoster(
  localSubs: ISubstituteDriver2026[],
  remoteSubs: ISubstituteDriver2026[]
): ISubstituteDriver2026[] {
  const byCode: Record<string, ISubstituteDriver2026> = {};
  for (const entry of [...localSubs, ...remoteSubs]) {
    if (!entry?.code) {
      continue;
    }
    const existing = byCode[entry.code];
    if (!existing) {
      byCode[entry.code] = { ...entry };
      continue;
    }
    const appearedRounds = Array.from(
      new Set([...(existing.appearedRounds || []), ...(entry.appearedRounds || [])])
    ).sort((a, b) => a - b);
    byCode[entry.code] = { ...existing, ...entry, appearedRounds };
  }
  return Object.values(byCode);
}

function addVersionToAsset(url: string | null | undefined, assetVersion: number) {
  if (!url || url.startsWith('http')) {
    return url;
  }
  return `${url}?v=${assetVersion}`;
}

export function decorateSeason2026Assets<T extends Record<string, any>>(items: T[], assetVersion: number) {
  return items.map((item) => ({
    ...item,
    image: addVersionToAsset(item.image, assetVersion),
    detailedImage: addVersionToAsset(item.detailedImage, assetVersion),
    flag: addVersionToAsset(item.flag, assetVersion),
    officialImage: addVersionToAsset(item.officialImage, assetVersion),
    logo: addVersionToAsset(item.logo, assetVersion),
    carImage: addVersionToAsset(item.carImage, assetVersion),
  }));
}

function getDatasetItemKey(item: unknown): string {
  if (!item || typeof item !== 'object') {
    return '';
  }
  const record = item as Record<string, unknown>;
  const value = record.slug ?? record.round ?? record.eventId;
  return value == null ? '' : String(value);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function mergePreferLocalFallback(localValue: unknown, remoteValue: unknown): unknown {
  if (Array.isArray(localValue) || Array.isArray(remoteValue)) {
    const localArray = Array.isArray(localValue) ? localValue : [];
    const remoteArray = Array.isArray(remoteValue) ? remoteValue : [];
    if (localArray.length === 0) {
      return remoteArray;
    }
    if (remoteArray.length === 0) {
      return localArray;
    }
    return remoteArray.length >= localArray.length ? remoteArray : localArray;
  }
  return hasMeaningfulValue(remoteValue) ? remoteValue : localValue;
}

function mergeScheduleItem(localItem: unknown, remoteItem: unknown): Record<string, unknown> {
  const local = (localItem ?? {}) as Record<string, unknown>;
  const remote = (remoteItem ?? {}) as Record<string, unknown>;
  return {
    ...local,
    ...remote,
    status: mergePreferLocalFallback(local.status, remote.status),
    dates: mergePreferLocalFallback(local.dates, remote.dates),
    sessions: mergePreferLocalFallback(local.sessions, remote.sessions),
  };
}

function mergeResultsItem(localItem: unknown, remoteItem: unknown): Record<string, unknown> {
  const local = (localItem ?? {}) as Record<string, unknown>;
  const remote = (remoteItem ?? {}) as Record<string, unknown>;
  return {
    ...local,
    ...remote,
    results: mergePreferLocalFallback(local.results, remote.results),
    sprintResults: mergePreferLocalFallback(local.sprintResults, remote.sprintResults),
  };
}

function mergeDatasetByKey(
  localData: unknown[],
  remoteData: unknown[],
  mergeItem: (localItem: unknown, remoteItem: unknown) => Record<string, unknown>
): Record<string, unknown>[] {
  const localMap = new Map<string, unknown>();
  localData.forEach((item) => {
    const key = getDatasetItemKey(item);
    if (key) {
      localMap.set(key, item);
    }
  });
  const remoteMap = new Map<string, unknown>();
  remoteData.forEach((item) => {
    const key = getDatasetItemKey(item);
    if (key) {
      remoteMap.set(key, item);
    }
  });
  const orderedKeys = [
    ...new Set(
      [...remoteData, ...localData]
        .map((item) => getDatasetItemKey(item))
        .filter((key) => key.length > 0)
    ),
  ];
  return orderedKeys.map((key) => {
    const localItem = localMap.get(key);
    const remoteItem = remoteMap.get(key);
    if (localItem && remoteItem) {
      return mergeItem(localItem, remoteItem);
    }
    return (remoteItem ?? localItem) as Record<string, unknown>;
  });
}

function serializeDataset(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

async function parseOptionalJson(response: Response | null): Promise<unknown> {
  if (!response || !response.ok) {
    return null;
  }
  try {
    return await response.json();
  } catch (error) {
    console.warn('[Season2026] Failed to parse optional JSON dataset', error);
    return null;
  }
}

async function parseCoreDatasetResponse(
  response: Response | null,
  datasetName: CoreDatasetName
): Promise<unknown[]> {
  const json = await parseOptionalJson(response);
  return isValidDataset(datasetName, json) ? json : [];
}

function pickPreferredDataset(
  name: CoreDatasetName,
  localData: unknown[],
  remoteData: unknown[]
): unknown[] {
  const localValid = isValidCoreDataset(name, localData);
  const remoteValid = isValidCoreDataset(name, remoteData);

  console.log(
    `[Data Sync] ${DATASET_LABELS[name]} - Local: ${localData.length}, Remote: ${remoteData.length}, RemoteValid: ${remoteValid}`
  );

  if (!remoteValid) {
    return localData;
  }
  if (!localValid) {
    return remoteData;
  }
  if (name === 'results2026' && localData.length > 0 && remoteData.length === 0) {
    return localData;
  }
  if (name === 'schedule') {
    return mergeDatasetByKey(localData, remoteData, mergeScheduleItem);
  }
  if (name === 'results2026') {
    return mergeDatasetByKey(localData, remoteData, mergeResultsItem);
  }
  return serializeDataset(localData) === serializeDataset(remoteData) ? localData : remoteData;
}

export async function loadPhotosIndex() {
  try {
    const response = await fetch('/photos/index.json');
    return response.ok ? await response.json() : [];
  } catch {
    console.warn('Failed to load photos index');
    return [];
  }
}

let season2026DataPromise: Promise<Season2026Data> | null = null;

async function fetchSeason2026Data(): Promise<Season2026Data> {
  const timestamp = Date.now();
  const fetches: Promise<Response | null>[] = [
    fetch(`/data/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/teams_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/substitutes_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/substitutes_2026.json?t=${timestamp}`).catch(() => null),
  ];

  const responses = await Promise.all(fetches);
  const [
    scheduleLocal,
    resultsLocal,
    driversLocal,
    teamsLocal,
    substitutesLocal,
    scheduleRemote,
    resultsRemote,
    driversRemote,
    teamsRemote,
    substitutesRemote,
  ] = responses;

  const localSchedule = await parseCoreDatasetResponse(scheduleLocal, 'schedule');
  const localResults = await parseCoreDatasetResponse(resultsLocal, 'results2026');
  const localDrivers = await parseCoreDatasetResponse(driversLocal, 'drivers2026');
  const localTeams = await parseCoreDatasetResponse(teamsLocal, 'teams2026');
  const remoteSchedule = await parseCoreDatasetResponse(scheduleRemote, 'schedule');
  const remoteResults = await parseCoreDatasetResponse(resultsRemote, 'results2026');
  const remoteDrivers = await parseCoreDatasetResponse(driversRemote, 'drivers2026');
  const remoteTeams = await parseCoreDatasetResponse(teamsRemote, 'teams2026');

  const localSubstitutes = parseSubstituteRoster(
    await parseOptionalJson(substitutesLocal)
  );
  const remoteSubstitutes = parseSubstituteRoster(
    await parseOptionalJson(substitutesRemote)
  );
  const substitutes2026 = mergeSubstituteRoster(localSubstitutes, remoteSubstitutes);

  const schedule = pickPreferredDataset('schedule', localSchedule, remoteSchedule);
  const results2026 = pickPreferredDataset('results2026', localResults, remoteResults);
  const drivers2026 = pickPreferredDataset('drivers2026', localDrivers, remoteDrivers);
  const teams2026 = pickPreferredDataset('teams2026', localTeams, remoteTeams);

  if (
    !isValidCoreDataset('schedule', schedule) ||
    !isValidCoreDataset('drivers2026', drivers2026) ||
    !isValidCoreDataset('teams2026', teams2026)
  ) {
    throw new Error('Failed to load 2026 runtime data');
  }

  console.log(
    '2026 Data Loaded (Synced):',
    results2026.length,
    'rounds,',
    drivers2026.length,
    'drivers,',
    teams2026.length,
    'teams,',
    substitutes2026.length,
    'substitutes'
  );

  return {
    schedule,
    results2026,
    drivers2026,
    teams2026,
    substitutes2026,
  };
}

export function resetSeason2026DataCache() {
  season2026DataPromise = null;
}

export async function loadSeason2026Data(options?: { forceRefresh?: boolean }) {
  if (options?.forceRefresh) {
    resetSeason2026DataCache();
  }

  if (!season2026DataPromise) {
    season2026DataPromise = fetchSeason2026Data().catch((error) => {
      season2026DataPromise = null;
      throw error;
    });
  }

  return season2026DataPromise;
}
