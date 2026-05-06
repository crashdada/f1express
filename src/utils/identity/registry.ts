import drivers from '../../data/identity/drivers.json';
import teams from '../../data/identity/teams.json';
import type { DriverRegistryRecord, TeamRegistryRecord } from './types';

export const driverRegistry = drivers as DriverRegistryRecord[];
export const teamRegistry = teams as TeamRegistryRecord[];
