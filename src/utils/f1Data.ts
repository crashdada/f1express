import { Driver, RaceResult, Team, SeasonStats, ProcessedDriverData, RaceInfo } from '../types';
import { CIRCUIT_TRANSLATIONS, COUNTRY_TRANSLATIONS, TEAM_TRANSLATIONS } from './translations';

const DB_NAME = 'F1DatabaseStore_v41'; // Force refresh (v41 - final fix for Cadillac color and translation)
const STORE_NAME = 'files';
const DB_VERSION = 1; // Reset version for new store
const DB_FILE_KEY = 'f1.db';
const REMOTE_DATA_BASE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/crashdada/f1-collector/main/data';

// --- Internal Helper Functions ---

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getLocalDriverPhotoPath(
  driver: { firstName: string, lastName: string },
  photoMap: Map<string, string>
): string | null {
  if (!photoMap || photoMap.size === 0) return null;

  const rawLast = driver.lastName.replace(/\s+/g, '_');
  const rawFirst = driver.firstName.replace(/\s+/g, '_');
  const normLast = normalizeName(rawLast);
  const normFirst = normalizeName(rawFirst);

  const candidates = [
    `${normLast.toUpperCase()}_${normFirst}.webp`,
    `${normLast.toUpperCase()}_${normFirst.toUpperCase()}.webp`,
    `${rawLast.toUpperCase()}_${rawFirst}.webp`,
  ];

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (photoMap.has(key)) {
      return `/photos/${photoMap.get(key)}`;
    }
  }
  return null;
}

function processDrivers(
  driversData: any[],
  photosIndex: string[],
  drivers2026: any[] = [],
  teams2026: any[] = []
): Driver[] {
  // Use a more specific key to avoid mis-mapping historical drivers with same code (e.g. HAM)
  const d2026Map = new Map<string, any>();
  drivers2026.forEach(d => {
    if (d.code) {
      const key = `${normalizeName(d.firstName).toLowerCase()}|${normalizeName(d.lastName).toLowerCase()}|${d.code.toUpperCase()}`;
      d2026Map.set(key, d);
    }
  });

  const t2026Map = new Map<string, any>();
  teams2026.forEach(t => { if (t.name) t2026Map.set(t.name, t); });

  const photoMap = new Map<string, string>();
  for (const p of photosIndex) {
    const filename = p.split('/').pop()?.toLowerCase() || '';
    if (filename && !photoMap.has(filename)) {
      photoMap.set(filename, p);
    }
  }

  return driversData.map(driver => {
    const code = (driver['code'] || '').toUpperCase();
    const firstName = normalizeName(driver['first_name'] || '').toLowerCase();
    const lastName = normalizeName(driver['last_name'] || '').toLowerCase();
    
    // Check for 2026 match using specific key
    const matchKey = `${firstName}|${lastName}|${code}`;
    const d2026 = d2026Map.get(matchKey);
    
    let points = Number(driver['total_points'] || 0);
    let wins = Number(driver['total_wins'] || 0);
    let podiums = Number(driver['total_podiums'] || 0);
    let poles = Number(driver['total_poles'] || 0);

    // Base stats from DB or 2026 authoritative record
    if (d2026 && d2026.careerStats) {
      points = Number(d2026.careerStats.points);
      wins = Number(d2026.careerStats.wins);
      podiums = Number(d2026.careerStats.podiums);
      poles = Number(d2026.careerStats.poles);
    }

    // Determine current team and color
    const teamNameRaw = d2026?.team || driver['team_name'] || '';
    // Case-insensitive search in 2026 teams map
    const t2026 = [...t2026Map.values()].find(t => 
      t.name.toLowerCase() === teamNameRaw.toLowerCase() || 
      t.name.toLowerCase().includes(teamNameRaw.toLowerCase()) || 
      teamNameRaw.toLowerCase().includes(t.name.toLowerCase())
    );
    const displayTeamName = d2026?.teamCn || t2026?.nameCn || driver['team_name_cn'] || TEAM_TRANSLATIONS[teamNameRaw] || teamNameRaw;
    const teamColor = t2026?.color || driver['team_color'] || '#6b7280';

    const baseDriver: Driver = {
      id: driver['driver_id'],
      number: d2026?.number || driver['number'] || 0,
      firstName: driver['first_name'] || '',
      lastName: driver['last_name'] || '',
      firstNameCn: driver['first_name_cn'] || '',
      lastNameCn: driver['last_name_cn'] || '',
      code: code,
      team: displayTeamName,
      nationality: driver['nationality'] || '',
      birthDate: driver['birth_date'] || undefined,
      birthPlace: driver['birth_place'] || undefined,
      age: driver['age'] || undefined,
      points: points,
      wins: wins,
      podiums: podiums,
      poles: poles,
      championships: driver['championships'] || 0,
      championshipYears: driver['championship_years'] ? driver['championship_years'].toString().split(',').map(Number) : [],
      avatar: d2026?.image || driver['avatar'] || '',
      teamColor: teamColor,
    };

    if (!baseDriver.avatar && photoMap.size > 0) {
      baseDriver.avatar = getLocalDriverPhotoPath(baseDriver, photoMap) || '';
    }

    return baseDriver;
  });
}

function processTeams(
  teamsData: any[],
  teams2026: any[] = []
): Team[] {
  const t2026Map = new Map<string, any>();
  teams2026.forEach(t => { if (t.name) t2026Map.set(t.name.toLowerCase(), t); });

  return teamsData.map(team => {
    const name = team['name'] || '';
    const nameLower = name.toLowerCase();
    const t2026 = t2026Map.get(nameLower);

    let points = Number(team['total_points'] || 0);
    let wins = Number(team['total_wins'] || 0);
    let podiums = Number(team['total_podiums'] || 0);
    let poles = Number(team['total_poles'] || 0);

    if (t2026 && t2026.stats) {
      // If we have total career stats in JSON (calculated by backend), it should be authoritative
      // but here we trust our live calculation for the current session to be safe
    }

    return {
      id: name,
      name: name,
      fullName: team['full_name'] || name || t2026?.fullName || '',
      nameCn: t2026?.nameCn || TEAM_TRANSLATIONS[name] || name,
      points: points,
      wins: wins,
      podiums: podiums,
      poles: poles,
      championships: team['championships'] || 0,
      driverChampionships: team['driver_championships'] || 0,
      championshipYears: [],
      color: t2026?.color || team['color'] || '#e10600',
      logo: t2026?.logo || team['logo'] || '',
    };
  });
}

function processRaceResults(raceResultsData: any[]): RaceResult[] {
  return raceResultsData.map(result => ({
    resultId: result['result_id'],
    driverId: result['driver_id'] || 0,
    position: result['position'] || 0,
    number: 0,
    firstName: result['first_name'] || '',
    lastName: result['last_name'] || '',
    firstNameCn: result['first_name_cn'] || '',
    lastNameCn: result['last_name_cn'] || '',
    code: result['code'] || '',
    team: result['team'] || '',
    laps: result['laps'] || 0,
    time: result['time'] || '',
    points: result['points'] || 0,
    grid: result['grid'] || 0,
    fastestLapTime: result['fastest_lap_time'] || '',
    url: result['url'] || '',
    season: result['season'],
    grandPrix: result['grand_prix'] || 'Round ' + (result['round_number'] || 0),
    circuit: '',
    date: '',
    roundNo: result['round_number'] || 0,
    isSprint: false,
  }));
}

function processRaceInfo(raceInfoData: any[]): RaceInfo[] {
  return raceInfoData.map(race => {
    const circuitName = race['circuit'] || '';
    const countryName = race['country'] || '';
    return {
      season: race['season'] || 0,
      roundNo: race['roundNo'] || 0,
      circuit: circuitName,
      circuitCn: CIRCUIT_TRANSLATIONS[circuitName] || circuitName,
      poleTime: race['poleTime'] || '',
      poleFirstName: race['poleFirstName'] || '',
      poleFirstNameCn: race['poleFirstNameCn'] || '',
      poleLastName: race['poleLastName'] || '',
      poleLastNameCn: race['poleLastNameCn'] || '',
      poleCode: race['poleCode'] || '',
      country: countryName,
      countryCn: COUNTRY_TRANSLATIONS[countryName] || countryName,
      startDate: race['startDate'] || '',
      endDate: race['endDate'] || '',
      url: race['url'] || '',
    };
  });
}

function processSeasonStats(seasonStatsData: any[]): SeasonStats[] {
  return seasonStatsData.map(stat => ({
    season: stat['season'],
    winner: stat['winner'] || 'Unknown',
    team: stat['team'] || 'Unknown',
    races: stat['races'] || 0,
  }));
}

// --- Database Connection Logic ---

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        indexedDB.deleteDatabase(DB_NAME);
        reject(new Error('Object store not found, deleting database for reset'));
      } else {
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

const getCachedDb = async (): Promise<Uint8Array | null> => {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DB_FILE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const saveDbToCache = async (data: Uint8Array) => {
  try {
    const db = await openDb();
    return new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, DB_FILE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('Failed to save DB to cache:', e);
  }
};

let dbInitialized = false;

// --- Primary Data Loading Function ---

export const loadF1Data = async (): Promise<ProcessedDriverData> => {
  try {
    if (!dbInitialized) {
      const initSqlJs = (window as any).initSqlJs;
      if (!initSqlJs) {
        throw new Error('sql.js not loaded');
      }

      const SQL = await initSqlJs({
        locateFile: (file: string) => `/libs/sql.js/${file}`
      }) as any;

      let buffer: Uint8Array | null = await getCachedDb();

      if (buffer) {
        console.log('Using cached database from IndexedDB, size:', (buffer as Uint8Array).byteLength);
      } else {
        console.log('Fetching database from /data/f1.db...');
        const response = await fetch(`/data/f1.db?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to fetch database: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        buffer = new Uint8Array(arrayBuffer);
        await saveDbToCache(buffer);
      }

      const db = new SQL.Database(buffer);
      (window as any).f1Db = db;
      dbInitialized = true;
    }

    const db = (window as any).f1Db;

    const safeExec = (sql: string) => {
      try {
        return db.exec(sql);
      } catch (e: any) {
        if (e.message?.includes('malformed') || e.toString().includes('malformed')) {
          indexedDB.deleteDatabase(DB_NAME);
          window.location.reload();
        }
        throw e;
      }
    };

    const driversQuery = safeExec(`
      SELECT 
        d.driver_id, d.code, d.first_name, d.last_name, d.first_name_cn, d.last_name_cn,
        d.nationality, d.birth_date, d.birth_place, d.age, d.number,
        COALESCE(stats.total_points, 0) as total_points,
        COALESCE(stats.total_wins, 0) as total_wins,
        COALESCE(stats.total_podiums, 0) as total_podiums,
        COALESCE(stats.total_poles, 0) as total_poles,
        COALESCE(champ.championships, 0) as championships,
        COALESCE(champ.years, '') as championship_years,
        COALESCE(dp.url, '') as avatar,
        COALESCE(lt.color, '#6b7280') as team_color,
        COALESCE(lt.team_name, '') as team_name
      FROM drivers d
      LEFT JOIN (
        SELECT driver_id, 
               SUM(CAST(points AS FLOAT)) as total_points,
               SUM(wins) as total_wins,
               SUM(podiums) as total_podiums,
               SUM(poles) as total_poles
        FROM driver_season_stats
        GROUP BY driver_id
      ) stats ON d.driver_id = stats.driver_id
      LEFT JOIN (
        SELECT driver_id, url FROM driver_photos GROUP BY driver_id
      ) dp ON d.driver_id = dp.driver_id
      LEFT JOIN (
        SELECT driver_id, COUNT(*) as championships, GROUP_CONCAT(season) as years
        FROM driver_championships WHERE rank = 1
        GROUP BY driver_id
      ) champ ON d.driver_id = champ.driver_id
      LEFT JOIN (
        SELECT dss2.driver_id, t.color, t.name as team_name
        FROM driver_season_stats dss2
        JOIN teams t ON dss2.team_id = t.team_id
        WHERE (dss2.driver_id, dss2.season) IN (
          SELECT driver_id, MAX(season) FROM driver_season_stats GROUP BY driver_id
        )
        GROUP BY dss2.driver_id
      ) lt ON d.driver_id = lt.driver_id
      GROUP BY d.driver_id
      ORDER BY total_points DESC
    `);

    const teamsQuery = safeExec(`
      SELECT 
        t.team_id, t.name, t.full_name, t.color,
        COALESCE(tp.url, '') as logo,
        COALESCE(SUM(tss.points), 0) as total_points,
        COALESCE(SUM(tss.wins), 0) as total_wins,
        COALESCE(SUM(tss.podiums), 0) as total_podiums,
        COALESCE(SUM(tss.poles), 0) as total_poles,
        COALESCE((SELECT COUNT(*) FROM team_championships tc WHERE tc.team_id = t.team_id AND tc.rank = 1), 0) as championships,
        COALESCE((SELECT COUNT(DISTINCT dc.season) FROM driver_championships dc WHERE dc.team_id = t.team_id AND dc.rank = 1), 0) as driver_championships
      FROM teams t
      LEFT JOIN team_season_stats tss ON t.team_id = tss.team_id
      LEFT JOIN team_photos tp ON t.team_id = tp.team_id
      GROUP BY t.team_id
      ORDER BY total_points DESC
    `);

    const raceResultsQuery = safeExec(`
      SELECT 
        rr.result_id, rr.driver_id, rr.position, rr.laps, rr.time, rr.points, rr.status,
        d.first_name, d.last_name, d.first_name_cn, d.last_name_cn, d.code,
        t.name as team, r.season, r.round_number, r.url, c.country as grand_prix,
        COALESCE(q.position, 0) as grid
      FROM race_results rr
      JOIN drivers d ON rr.driver_id = d.driver_id
      LEFT JOIN teams t ON rr.team_id = t.team_id
      JOIN races r ON rr.race_id = r.race_id
      JOIN circuits c ON r.circuit_id = c.circuit_id
      LEFT JOIN qualifying q ON rr.race_id = q.race_id AND rr.driver_id = q.driver_id
      ORDER BY r.season DESC, r.round_number, rr.position
    `);

    const driverChampsQuery = safeExec(`SELECT driver_id, season, rank FROM driver_championships`);

    const raceInfoQuery = safeExec(`
      SELECT DISTINCT 
        r.season, r.round_number as roundNo, c.name as circuit, r.race_date as startDate,
        r.race_date as endDate, r.url,
        (SELECT d.first_name FROM race_results rr2 JOIN drivers d ON rr2.driver_id = d.driver_id WHERE rr2.race_id = r.race_id AND rr2.position = 1 LIMIT 1) as poleFirstName,
        (SELECT d.first_name_cn FROM race_results rr2 JOIN drivers d ON rr2.driver_id = d.driver_id WHERE rr2.race_id = r.race_id AND rr2.position = 1 LIMIT 1) as poleFirstNameCn,
        (SELECT d.last_name FROM race_results rr2 JOIN drivers d ON rr2.driver_id = d.driver_id WHERE rr2.race_id = r.race_id AND rr2.position = 1 LIMIT 1) as poleLastName,
        (SELECT d.last_name_cn FROM race_results rr2 JOIN drivers d ON rr2.driver_id = d.driver_id WHERE rr2.race_id = r.race_id AND rr2.position = 1 LIMIT 1) as poleLastNameCn,
        (SELECT d.code FROM race_results rr2 JOIN drivers d ON rr2.driver_id = d.driver_id WHERE rr2.race_id = r.race_id AND rr2.position = 1 LIMIT 1) as poleCode,
        r.race_date as poleTime, c.country
      FROM races r JOIN circuits c ON r.circuit_id = c.circuit_id
      ORDER BY r.season DESC, r.round_number
    `);

    const seasonStatsQuery = safeExec(`
      SELECT r.season, d.first_name || ' ' || d.last_name as winner, t.name as team, COUNT(DISTINCT r.race_id) as races
      FROM races r JOIN race_results rr ON r.race_id = rr.race_id JOIN drivers d ON rr.driver_id = d.driver_id
      LEFT JOIN teams t ON rr.team_id = t.team_id WHERE rr.position = 1 GROUP BY r.season ORDER BY r.season DESC
    `);

    let photosIndex: string[] = [];
    try {
      const pResponse = await fetch('/photos/index.json');
      if (pResponse.ok) photosIndex = await pResponse.json();
    } catch (e) {
      console.warn('Failed to load photos index');
    }

    const REMOTE_MIRROR = 'https://ghproxy.net/https://raw.githubusercontent.com/crashdada/f1-collector/main/data';
    let schedule: any[] = [];
    let results2026: any[] = [];
    let drivers2026: any[] = [];
    let teams2026: any[] = [];
    try {
      const timestamp = Date.now();
      // Fetch both local and remote to ensure we have the most up-to-date data
      const [sLoc, rLoc, dLoc, sRem, rRem, dRem] = await Promise.all([
        fetch(`/data/schedule_2026.json?t=${timestamp}`).catch(() => null),
        fetch(`/data/results_2026.json?t=${timestamp}`).catch(() => null),
        fetch(`/data/drivers_2026.json?t=${timestamp}`).catch(() => null),
        fetch(`${REMOTE_MIRROR}/schedule_2026.json?t=${timestamp}`).catch(() => null),
        fetch(`${REMOTE_MIRROR}/results_2026.json?t=${timestamp}`).catch(() => null),
        fetch(`${REMOTE_MIRROR}/drivers_2026.json?t=${timestamp}`).catch(() => null)
      ]);

      const getNewer = async (locRes: any, remRes: any, name: string) => {
        const loc = locRes && locRes.ok ? await locRes.json() : [];
        const rem = remRes && remRes.ok ? await remRes.json() : [];
        console.log(`[Data Sync] ${name} - Local: ${loc.length}, Remote: ${rem.length}`);
        return (rem.length > loc.length && rem.length > 0) ? rem : loc;
      };

      schedule = await getNewer(sLoc, sRem, 'Schedule');
      results2026 = await getNewer(rLoc, rRem, 'Results');
      drivers2026 = await getNewer(dLoc, dRem, 'Drivers');
      
      const tLoc = `/data/teams_2026.json?t=${Date.now()}`;
      const tRem = `${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${Date.now()}`;
      teams2026 = await getNewer(tLoc, tRem, 'Teams');

      console.log('2026 Data Loaded (Synced):', results2026.length, 'rounds,', drivers2026.length, 'drivers,', teams2026.length, 'teams');
    } catch (e) {
      console.warn('Failed to load 2026 data', e);
    }

    const convertQueryToData = (queryResult: any) => {
      if (!queryResult || queryResult.length === 0) return [];
      const { columns, values } = queryResult[0];
      return values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
    };

    const driversData = convertQueryToData(driversQuery);
    const teamsData = convertQueryToData(teamsQuery);
    const raceResultsData = convertQueryToData(raceResultsQuery);
    const raceInfoData = convertQueryToData(raceInfoQuery);
    const seasonStatsData = convertQueryToData(seasonStatsQuery);
    const driverChampsData = convertQueryToData(driverChampsQuery);

    const drivers = processDrivers(driversData, photosIndex, drivers2026, teams2026);
    const teams = processTeams(teamsData, teams2026);
    let raceResults = processRaceResults(raceResultsData);

    if (results2026.length > 0) {
      const codeToIdMap = new Map<string, number>();
      drivers.forEach(d => { if (d.code) codeToIdMap.set(d.code, d.id as number); });
      const processed2026 = results2026.flatMap((round: any) => {
        const roundResults = (round.results || []).map((r: any) => ({
          resultId: 2026000 + round.round * 100 + (r.pos || 99),
          driverId: codeToIdMap.get(r.code) || 0,
          position: r.pos || 0, points: Number(r.points || 0),
          firstName: r.firstName || '', lastName: r.lastName || '', firstNameCn: r.firstNameCn || '', lastNameCn: r.lastNameCn || '',
          code: r.code || '', team: r.team || '', season: 2026, grandPrix: round.country || `Round ${round.round}`,
          roundNo: round.round, isSprint: false, laps: 0, time: '', url: ''
        }));
        const sprintResults = (round.sprintResults || []).map((r: any) => ({
          resultId: 2026500 + round.round * 100 + (r.pos || 99),
          driverId: codeToIdMap.get(r.code) || 0,
          position: r.pos || 0, points: Number(r.points || 0),
          firstName: r.firstName || '', lastName: r.lastName || '', firstNameCn: r.firstNameCn || '', lastNameCn: r.lastNameCn || '',
          code: r.code || '', team: r.team || '', season: 2026, grandPrix: `${round.country} (Sprint)`,
          roundNo: round.round, isSprint: true, laps: 0, time: '', url: ''
        }));
        return [...roundResults, ...sprintResults];
      });
      raceResults = [...processed2026, ...raceResults];
    }

    return { 
      drivers, raceResults, teams, 
      seasonStats: processSeasonStats(seasonStatsData),
      schedule, 
      raceInfo: processRaceInfo(raceInfoData),
      photosIndex,
      driverChampionships: driverChampsData.map((d: any) => ({ driverId: d.driver_id, season: d.season, rank: d.rank }))
    };
  } catch (error) {
    console.error('Error loading F1 data:', error);
    return { drivers: [], raceResults: [], teams: [], seasonStats: [], schedule: [], raceInfo: [], photosIndex: [], driverChampionships: [] };
  }
};

// --- Exported Utility Functions ---

export const getCurrentSeason = (): number => new Date().getFullYear();

export const getDriverDisplayName = (driver: { firstName: string; lastName: string; firstNameCn?: string; lastNameCn?: string }): string => {
  if (driver.firstNameCn && driver.lastNameCn) return `${driver.lastNameCn}${driver.firstNameCn}`;
  return `${driver.firstName} ${driver.lastName}`;
};

export const getTeamDisplayName = (team: { name: string; fullName?: string; nameCn?: string } | null | undefined): string => {
  if (!team) return 'Unknown Team';
  if (team.nameCn) return team.nameCn;
  if (team.fullName) return team.fullName;
  return team.name || 'Unknown Team';
};
