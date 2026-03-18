import { Driver, RaceInfo, RaceResult, SeasonStats, Team } from '../../types';
import { CIRCUIT_TRANSLATIONS, COUNTRY_TRANSLATIONS, TEAM_TRANSLATIONS } from '../translations';
import { normalizeName } from './formatters';

const HIDDEN_INDY_SPECIAL_TEAMS = new Set([
  'Adams',
  'Deidt',
  'Snowberger',
  'Kurtis Kraft',
  'Watson',
  'Stevens',
  'Langley',
  'Lesovsky',
  'Olson',
  'Wetteroth',
  'Ewing',
  'Moore',
  'Marchese',
  'Nichels',
  'Rae',
  'Schroeder',
  'Sherman',
  'Hall',
  'Trevis',
  'Epperly',
  'Phillips',
  'Dunn',
  'Christensen',
  'Elder',
  'Sutton',
  'Meskowski',
  'Kuzma',
]);

function getLocalDriverPhotoPath(
  driver: { firstName: string; lastName: string },
  photoMap: Map<string, string>
): string | null {
  if (photoMap.size === 0) {
    return null;
  }

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

export function processDrivers(
  driversData: any[],
  photosIndex: string[],
  drivers2026: any[] = [],
  teams2026: any[] = []
): Driver[] {
  const drivers2026Map = new Map<string, any>();
  for (const driver of drivers2026) {
    if (!driver.code) {
      continue;
    }

    const key = `${normalizeName(driver.firstName).toLowerCase()}|${normalizeName(driver.lastName).toLowerCase()}|${driver.code.toUpperCase()}`;
    drivers2026Map.set(key, driver);
  }

  const teams2026Map = new Map<string, any>();
  for (const team of teams2026) {
    if (team.name) {
      teams2026Map.set(team.name, team);
    }
  }

  const photoMap = new Map<string, string>();
  for (const photoPath of photosIndex) {
    const filename = photoPath.split('/').pop()?.toLowerCase() || '';
    if (filename && !photoMap.has(filename)) {
      photoMap.set(filename, photoPath);
    }
  }

  return driversData.map((driver) => {
    const code = (driver.code || '').toUpperCase();
    const firstName = normalizeName(driver.first_name || '').toLowerCase();
    const lastName = normalizeName(driver.last_name || '').toLowerCase();
    const driver2026 = drivers2026Map.get(`${firstName}|${lastName}|${code}`);

    // Historical career totals come from the local database.
    // 2026 datasets only supply live-season roster metadata and should not
    // overwrite authoritative historical aggregates from SQLite.
    const points = Number(driver.total_points || 0);
    const wins = Number(driver.total_wins || 0);
    const podiums = Number(driver.total_podiums || 0);
    const poles = Number(driver.total_poles || 0);

    const teamName = driver2026?.team || driver.team_name || '';
    const team2026 = [...teams2026Map.values()].find((team) =>
      team.name.toLowerCase() === teamName.toLowerCase() ||
      team.name.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(team.name.toLowerCase())
    );

    const processedDriver: Driver = {
      id: driver.driver_id,
      number: driver2026?.number || driver.number || 0,
      firstName: driver.first_name || '',
      lastName: driver.last_name || '',
      firstNameCn: driver.first_name_cn || driver2026?.firstNameCn || '',
      lastNameCn: driver.last_name_cn || driver2026?.lastNameCn || '',
      code,
      team: driver2026?.teamCn || team2026?.nameCn || driver.team_name_cn || TEAM_TRANSLATIONS[teamName] || teamName,
      nationality: driver.nationality || '',
      birthDate: driver.birth_date || undefined,
      birthPlace: driver.birth_place || undefined,
      age: driver.age || undefined,
      points,
      wins,
      podiums,
      poles,
      championships: driver.championships || 0,
      championshipYears: driver.championship_years ? driver.championship_years.toString().split(',').map(Number) : [],
      avatar: driver2026?.image || driver.avatar || '',
      teamColor: team2026?.color || driver.team_color || '#6b7280',
    };

    if (!processedDriver.avatar && photoMap.size > 0) {
      processedDriver.avatar = getLocalDriverPhotoPath(processedDriver, photoMap) || '';
    }

    return processedDriver;
  });
}

export function processTeams(teamsData: any[], teams2026: any[] = []): Team[] {
  const teams2026Map = new Map<string, any>();
  for (const team of teams2026) {
    if (team.name) {
      teams2026Map.set(team.name.toLowerCase(), team);
    }
  }

  return teamsData.map((team) => {
    const name = team.name || '';
    const team2026 = teams2026Map.get(name.toLowerCase());

    return {
      id: name,
      name,
      fullName: team.full_name || name || team2026?.fullName || '',
      nameCn: team2026?.nameCn || TEAM_TRANSLATIONS[name] || name,
      points: Number(team.total_points || 0),
      wins: Number(team.total_wins || 0),
      podiums: Number(team.total_podiums || 0),
      poles: Number(team.total_poles || 0),
      championships: team.championships || 0,
      driverChampionships: team.driver_championships || 0,
      championshipYears: [],
      color: team2026?.color || team.color || '#e10600',
      logo: team2026?.logo || team.logo || '',
    };
  }).filter((team) => !HIDDEN_INDY_SPECIAL_TEAMS.has(team.name));
}

export function processRaceResults(raceResultsData: any[]): RaceResult[] {
  return raceResultsData.map((result) => ({
    resultId: result.result_id,
    driverId: result.driver_id || 0,
    position: result.position || 0,
    number: 0,
    firstName: result.first_name || '',
    lastName: result.last_name || '',
    firstNameCn: result.first_name_cn || '',
    lastNameCn: result.last_name_cn || '',
    code: result.code || '',
    team: result.team || '',
    laps: result.laps || 0,
    time: result.time || '',
    points: result.points || 0,
    grid: result.grid || 0,
    fastestLapTime: result.fastest_lap_time || '',
    url: result.url || '',
    season: result.season,
    grandPrix: result.grand_prix || `Round ${result.round_number || 0}`,
    circuit: '',
    date: '',
    roundNo: result.round_number || 0,
    isSprint: false,
  }));
}

export function processRaceInfo(raceInfoData: any[]): RaceInfo[] {
  return raceInfoData.map((race) => {
    const circuitName = race.circuit || '';
    const countryName = race.country || '';

    return {
      season: race.season || 0,
      roundNo: race.roundNo || 0,
      circuit: circuitName,
      circuitCn: CIRCUIT_TRANSLATIONS[circuitName] || circuitName,
      poleTime: race.poleTime || '',
      poleFirstName: race.poleFirstName || '',
      poleFirstNameCn: race.poleFirstNameCn || '',
      poleLastName: race.poleLastName || '',
      poleLastNameCn: race.poleLastNameCn || '',
      poleCode: race.poleCode || '',
      country: countryName,
      countryCn: COUNTRY_TRANSLATIONS[countryName] || countryName,
      startDate: race.startDate || '',
      endDate: race.endDate || '',
      url: race.url || '',
    };
  });
}

export function processSeasonStats(seasonStatsData: any[]): SeasonStats[] {
  return seasonStatsData.map((stat) => ({
    season: stat.season,
    winner: stat.winner || 'Unknown',
    team: stat.team || 'Unknown',
    races: stat.races || 0,
  }));
}

export function convertQueryToData(queryResult: any) {
  if (!queryResult || queryResult.length === 0) {
    return [];
  }

  const { columns, values } = queryResult[0];
  return values.map((row: any) => {
    const obj: any = {};
    columns.forEach((col: string, index: number) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

export function mergeDynamicRaceResults(drivers: Driver[], raceResults: RaceResult[], results2026: any[]) {
  if (results2026.length === 0) {
    return raceResults;
  }

  const codeToIdMap = new Map<string, number>();
  for (const driver of drivers) {
    if (driver.code) {
      codeToIdMap.set(driver.code, driver.id as number);
    }
  }

  const dynamicRaceResults = results2026.flatMap((round: any) => {
    const roundResults = (round.results || []).map((result: any) => ({
      resultId: 2026000 + round.round * 100 + (result.pos || 99),
      driverId: codeToIdMap.get(result.code) || 0,
      position: result.pos || 0,
      points: Number(result.points || 0),
      firstName: result.firstName || '',
      lastName: result.lastName || '',
      firstNameCn: result.firstNameCn || '',
      lastNameCn: result.lastNameCn || '',
      code: result.code || '',
      team: result.team || '',
      season: 2026,
      grandPrix: round.country || `Round ${round.round}`,
      roundNo: round.round,
      isSprint: false,
      laps: 0,
      time: '',
      url: '',
    }));

    const sprintResults = (round.sprintResults || []).map((result: any) => ({
      resultId: 2026500 + round.round * 100 + (result.pos || 99),
      driverId: codeToIdMap.get(result.code) || 0,
      position: result.pos || 0,
      points: Number(result.points || 0),
      firstName: result.firstName || '',
      lastName: result.lastName || '',
      firstNameCn: result.firstNameCn || '',
      lastNameCn: result.lastNameCn || '',
      code: result.code || '',
      team: result.team || '',
      season: 2026,
      grandPrix: `${round.country} (Sprint)`,
      roundNo: round.round,
      isSprint: true,
      laps: 0,
      time: '',
      url: '',
    }));

    return [...roundResults, ...sprintResults];
  });

  return [...dynamicRaceResults, ...raceResults];
}
