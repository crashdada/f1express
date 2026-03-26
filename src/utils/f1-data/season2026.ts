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

function isLocalhost() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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

function getResultsDatasetEntryCount(rounds: any[]) {
  return rounds.reduce((total, round) => {
    const raceResults = Array.isArray(round?.results) ? round.results.length : 0;
    const sprintResults = Array.isArray(round?.sprintResults) ? round.sprintResults.length : 0;
    return total + raceResults + sprintResults;
  }, 0);
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

  if (name === 'results2026') {
    const localEntryCount = getResultsDatasetEntryCount(localData);
    const remoteEntryCount = getResultsDatasetEntryCount(remoteData);

    if (localEntryCount !== remoteEntryCount) {
      return localEntryCount > remoteEntryCount ? localData : remoteData;
    }
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
  ];

  if (!isLocalhost()) {
    fetches.push(
      fetch(`${REMOTE_DATA_BASE_URL}/schedule_2026.json?t=${timestamp}`).catch(() => null),
      fetch(`${REMOTE_DATA_BASE_URL}/results_2026.json?t=${timestamp}`).catch(() => null),
      fetch(`${REMOTE_DATA_BASE_URL}/drivers_2026.json?t=${timestamp}`).catch(() => null),
      fetch(`${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${timestamp}`).catch(() => null),
    );
  }

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
