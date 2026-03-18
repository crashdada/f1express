import { REMOTE_DATA_BASE_URL } from './constants';

const REMOTE_MIRROR = 'https://ghproxy.net/https://raw.githubusercontent.com/crashdada/f1-collector/main/data';

async function getNewerDataset(localResponse: Response | null, remoteResponse: Response | null, name: string) {
  const localData = localResponse && localResponse.ok ? await localResponse.json() : [];
  const remoteData = remoteResponse && remoteResponse.ok ? await remoteResponse.json() : [];
  console.log(`[Data Sync] ${name} - Local: ${localData.length}, Remote: ${remoteData.length}`);
  return remoteData.length > localData.length && remoteData.length > 0 ? remoteData : localData;
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

export async function loadSeason2026Data() {
  const timestamp = Date.now();
  const [scheduleLocal, resultsLocal, driversLocal, teamsLocal, scheduleRemote, resultsRemote, driversRemote, teamsRemote] = await Promise.all([
    fetch(`/data/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`/data/teams_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_MIRROR}/schedule_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_MIRROR}/results_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_MIRROR}/drivers_2026.json?t=${timestamp}`).catch(() => null),
    fetch(`${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${timestamp}`).catch(() => null),
  ]);

  const schedule = await getNewerDataset(scheduleLocal, scheduleRemote, 'Schedule');
  const results2026 = await getNewerDataset(resultsLocal, resultsRemote, 'Results');
  const drivers2026 = await getNewerDataset(driversLocal, driversRemote, 'Drivers');
  const teams2026 = await getNewerDataset(teamsLocal, teamsRemote, 'Teams');

  console.log('2026 Data Loaded (Synced):', results2026.length, 'rounds,', drivers2026.length, 'drivers,', teams2026.length, 'teams');

  return {
    schedule,
    results2026,
    drivers2026,
    teams2026,
  };
}
