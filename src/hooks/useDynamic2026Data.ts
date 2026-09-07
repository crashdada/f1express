import { useEffect, useState } from 'react';
import {
  IDriver2026,
  IRaceResult2026,
  ISubstituteDriver2026,
  ITeam2026,
} from '../types';
import { REMOTE_DATA_BASE_URL } from '../utils/f1-data/constants';
import { decorateSeason2026Assets, loadSeason2026Data } from '../utils/f1-data/season2026';

export { REMOTE_DATA_BASE_URL };
export type { IRaceResult2026, ISubstituteDriver2026 } from '../types';

interface F1Event {
  round: string;
  country: string;
  gpName: string;
  dates: string;
  image: string | null;
  flag?: string;
  slug?: string;
  sessions?: { name: string; time: string }[];
  roundNumber?: number;
  status?: string;
}

export interface IRaceRound2026 {
  round: number;
  country: string;
  slug: string;
  date: string;
  polePosition?: {
    time: string;
    code: string;
    firstName: string;
    lastName: string;
    firstNameCn: string;
    lastNameCn: string;
  };
  results: IRaceResult2026[];
  sprintResults?: IRaceResult2026[];
}

interface DynamicDataState {
  schedule: F1Event[];
  drivers: IDriver2026[];
  teams: ITeam2026[];
  substitutes: ISubstituteDriver2026[];
  liveDrivers: IDriver2026[];
  raceResults: IRaceRound2026[];
  loading: boolean;
  error: Error | null;
}

function mergeRosters(
  drivers: IDriver2026[],
  substitutes: ISubstituteDriver2026[]
): IDriver2026[] {
  const byCode: Record<string, IDriver2026> = {};
  for (const driver of drivers) {
    if (driver?.code) {
      byCode[driver.code] = driver;
    }
  }
  for (const sub of substitutes) {
    if (!sub?.code) {
      continue;
    }
    if (byCode[sub.code]) {
      continue;
    }
    byCode[sub.code] = {
      id: `sub-${sub.code}`.toLowerCase(),
      firstName: sub.firstName,
      lastName: sub.lastName,
      firstNameCn: sub.firstNameCn,
      lastNameCn: sub.lastNameCn,
      code: sub.code,
      number: sub.number,
      team: sub.team,
      teamCn: sub.teamCn,
      country: sub.country || '',
      image: sub.image || '',
      role: 'Reserve',
    };
  }
  return Object.values(byCode);
}

export function useDynamic2026Data() {
  const [data, setData] = useState<DynamicDataState>({
    schedule: [],
    drivers: [],
    teams: [],
    substitutes: [],
    liveDrivers: [],
    raceResults: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const assetVersion = Date.now();
        const season2026Data = await loadSeason2026Data();

        if (!isMounted) {
          return;
        }

        const drivers = decorateSeason2026Assets(
          season2026Data.drivers2026 as unknown as Record<string, any>[],
          assetVersion
        ) as IDriver2026[];
        const teams = decorateSeason2026Assets(
          season2026Data.teams2026 as unknown as Record<string, any>[],
          assetVersion
        ) as ITeam2026[];
        const substitutes = season2026Data.substitutes2026;
        const liveDrivers = mergeRosters(drivers, substitutes);

        setData({
          schedule: decorateSeason2026Assets(
            season2026Data.schedule as unknown as Record<string, any>[],
            assetVersion
          ),
          drivers,
          teams,
          substitutes,
          liveDrivers,
          raceResults: season2026Data.results2026 as IRaceRound2026[],
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Failed to load local baseline data', err);
        if (isMounted) {
          setData((prev) => ({ ...prev, loading: false, error: err as Error }));
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}
