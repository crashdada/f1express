import { REMOTE_DATA_BASE_URL } from './constants';

type Season2026Data = {
  schedule: any[];
  results2026: any[];
  drivers2026: any[];
  teams2026: any[];
};

type DatasetName = keyof Season2026Data;

const DATASET_LABELS: Record<DatasetName, string> = {
  schedule: 'Schedule',
  results2026: 'Results',
  drivers2026: 'Drivers',
  teams2026: 'Teams',
};

let season2026DataPromise: Promise<Season2026Data> | null = null;

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

function isValidDataset(name: DatasetName, value: unknown) {
  if (!Array.isArray(value)) {
    return false;
  }

  switch (name) {
    case 'schedule':
      return value.length >= 20;
    case 'drivers2026':
    case 'teams2026':
      return value.length > 0;
    case 'results2026':
      return true;
    default:
      return false;
  }
}

function serializeDataset(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function getDatasetItemKey(item: any) {
  return String(item?.slug ?? item?.round ?? item?.eventId ?? '');
}

function hasMeaningfulValue(value: unknown) {
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

function mergePreferLocalFallback(localValue: any, remoteValue: any) {
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

function mergeScheduleItem(localItem: any, remoteItem: any) {
  return {
    ...localItem,
    ...remoteItem,
    status: mergePreferLocalFallback(localItem?.status, remoteItem?.status),
    dates: mergePreferLocalFallback(localItem?.dates, remoteItem?.dates),
    sessions: mergePreferLocalFallback(localItem?.sessions, remoteItem?.sessions),
  };
}

function mergeResultsItem(localItem: any, remoteItem: any) {
  return {
    ...localItem,
    ...remoteItem,
    results: mergePreferLocalFallback(localItem?.results, remoteItem?.results),
    sprintResults: mergePreferLocalFallback(localItem?.sprintResults, remoteItem?.sprintResults),
  };
}

function mergeDatasetByKey(localData: any[], remoteData: any[], mergeItem: (localItem: any, remoteItem: any) => any) {
  const localMap = new Map(localData.map((item) => [getDatasetItemKey(item), item]));
  const remoteMap = new Map(remoteData.map((item) => [getDatasetItemKey(item), item]));
  const orderedKeys = [...new Set([...remoteData, ...localData].map((item) => getDatasetItemKey(item)).filter(Boolean))];

  return orderedKeys.map((key) => {
    const localItem = localMap.get(key);
    const remoteItem = remoteMap.get(key);

    if (localItem && remoteItem) {
      return mergeItem(localItem, remoteItem);
    }

    return remoteItem ?? localItem;
  });
}

async function parseDatasetResponse(response: Response | null, datasetName: DatasetName) {
  if (!response || !response.ok) {
    return [];
  }

  const data = await response.json();
  return isValidDataset(datasetName, data) ? data : [];
}

function pickPreferredDataset(name: DatasetName, localData: any[], remoteData: any[]) {
  const localValid = isValidDataset(name, localData);
  const remoteValid = isValidDataset(name, remoteData);

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

async function fetchSeason2026Data(): Promise<Season2026Data> {
  const timestamp = Date.now();
  const fetches: Promise<Response | null>[] = [
    fetch(`/data/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/teams_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${timestamp}`).catch(() => null),
  ];

  const responses = await Promise.all(fetches);
  const [scheduleLocal, resultsLocal, driversLocal, teamsLocal, scheduleRemote, resultsRemote, driversRemote, teamsRemote] =
    responses;

  const localSchedule = await parseDatasetResponse(scheduleLocal, 'schedule');
  const localResults = await parseDatasetResponse(resultsLocal, 'results2026');
  const localDrivers = await parseDatasetResponse(driversLocal, 'drivers2026');
  const localTeams = await parseDatasetResponse(teamsLocal, 'teams2026');
  const remoteSchedule = await parseDatasetResponse(scheduleRemote ?? null, 'schedule');
  const remoteResults = await parseDatasetResponse(resultsRemote ?? null, 'results2026');
  const remoteDrivers = await parseDatasetResponse(driversRemote ?? null, 'drivers2026');
  const remoteTeams = await parseDatasetResponse(teamsRemote ?? null, 'teams2026');

  const schedule = pickPreferredDataset('schedule', localSchedule, remoteSchedule);
  const results2026 = pickPreferredDataset('results2026', localResults, remoteResults);
  const drivers2026 = pickPreferredDataset('drivers2026', localDrivers, remoteDrivers);
  const teams2026 = pickPreferredDataset('teams2026', localTeams, remoteTeams);

  if (
    !isValidDataset('schedule', schedule) ||
    !isValidDataset('drivers2026', drivers2026) ||
    !isValidDataset('teams2026', teams2026)
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
    'teams'
  );

  return {
    schedule,
    results2026,
    drivers2026,
    teams2026,
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
