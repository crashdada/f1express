export interface IDriver {
  id: number;
  number: number | string;
  firstName: string;
  lastName: string;
  firstNameCn: string;
  lastNameCn: string;
  code: string;
  team: string;
  nationality: string;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  championships: number;
  championshipYears?: number[];
  avatar?: string;
  teamColor?: string;
  birthDate?: string;
  birthPlace?: string;
  age?: number;
}

export interface IRaceResult {
  resultId: number;
  position: number;
  number: number;
  driverId: number;
  firstName: string;
  lastName: string;
  firstNameCn: string;
  lastNameCn: string;
  code: string;
  team: string;
  laps: number;
  time: string;
  points: number;
  grid?: number;
  fastestLapTime?: string;
  url: string;
  season?: number;
  grandPrix?: string;
  circuit?: string;
  date?: string;
  roundNo?: number;
}

export interface ITeam {
  id: string;
  name: string;
  fullName: string;
  nameCn: string;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  championships: number;
  driverChampionships: number;
  championshipYears?: number[];
  color: string;
  logo?: string;
}

export interface ISeasonStats {
  season: number;
  winner: string;
  team: string;
  races: number;
}

export interface ISchedule {
  url: string;
  date: string;
  circuit: string;
  season: number;
  grandPrix: string;
  roundNo?: number;
  poleTime?: string;
  poleFirstName?: string;
  poleLastName?: string;
  poleCode?: string;
  country?: string;
  countryCn?: string;
  startDate?: string;
  endDate?: string;
  sessions?: { name: string; time: string }[];
  location?: string;
  gpName?: string;
}

export interface IRaceInfo {
  season: number;
  roundNo: number;
  circuit: string;
  circuitCn: string;
  poleTime: string;
  poleFirstName: string;
  poleFirstNameCn: string;
  poleLastName: string;
  poleLastNameCn: string;
  poleCode: string;
  country: string;
  countryCn: string;
  startDate: string;
  endDate: string;
  url: string;
}

export interface IDriverPhoto {
  code: string;
  url: string;
}

export interface ITeamPhoto {
  team: string;
  url: string;
}

export interface IDriver2026 {
  id: string;
  firstName: string;
  lastName: string;
  firstNameCn: string;
  lastNameCn: string;
  code: string;
  number: number;
  team: string;
  teamCn: string;
  country: string;
  image: string;
  age?: number;
  nationalityCn?: string;
  role?: 'Primary' | 'Reserve' | 'Academy';
  // 新增描述性字段 (由采集端翻译)
  outlookCn?: string;
  expectedStatusCn?: string;
  keyAdvantageCn?: string;
  // 新增统计数据字段
  stats?: {
    wins: number;
    podiums: number;
    points: number;
    rank: number;
    poles?: number;
    fastestLaps?: number;
  };
  careerStats?: {
    wins: number;
    podiums: number;
    poles?: number;
    points: number;
    entries: number;
    championships: number;
  };
  signatureStats?: {
    debut: number;
    avgPoints: number;
    peak: string;
    winRate: string;
  };
  bioCn?: string;
}

export interface ITeam2026 {
  id: string;
  name: string;
  nameCn: string;
  color: string;
  logo: string;
  drivers: string[]; // Codes
  carImage: string;
  engine: string;
  engineCn: string;
  base: string;
  baseCn: string;
  principal?: string;
  principalCn?: string;
  // 新增描述性字段 (由采集端翻译)
  techOutlookCn?: string;
  expectedFormCn?: string;
  keyProjectCn?: string;
  aerodynamicsScore?: number;
  powerUnitScore?: number;
  reliabilityScore?: number;
  principalViewCn?: string;
  // 新增统计数据字段
  stats?: {
    wins: number;
    podiums: number;
    points: number;
    rank: number;
  };
  history?: {
    championships: number;
    wins: number;
    podiums: number;
    poles?: number;
    entries: number;
    firstEntry: string;
  };
}

export interface IProcessedDriverData {
  drivers: IDriver[];
  teams: ITeam[];
  raceResults: IRaceResult[];
  seasonStats: ISeasonStats[];
  schedule: ISchedule[];
  raceInfo: IRaceInfo[];
  photosIndex: string[];
  driverChampionships: { driverId: number, season: number, rank: number }[];
}

export interface IF1Data {
  drivers: IDriver[];
  teams: ITeam[];
  raceResults: IRaceResult[];
  schedule: ISchedule[];
  raceInfo: IRaceInfo[];
}

// Type aliases for backward compatibility during migration
export type Driver = IDriver;
export type RaceResult = IRaceResult;
export type Team = ITeam;
export type SeasonStats = ISeasonStats;
export type Schedule = ISchedule;
export type RaceInfo = IRaceInfo;
export type DriverPhoto = IDriverPhoto;
export type TeamPhoto = ITeamPhoto;
export type ProcessedDriverData = IProcessedDriverData;
export type F1Data = IF1Data;
