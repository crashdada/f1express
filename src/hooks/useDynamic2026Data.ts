import { useEffect, useState } from 'react';
import { IDriver2026, ITeam2026 } from '../types';
import { REMOTE_DATA_BASE_URL } from '../utils/f1-data/constants';
import { decorateSeason2026Assets, loadSeason2026Data } from '../utils/f1-data/season2026';

export { REMOTE_DATA_BASE_URL };

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

export interface IRaceResult2026 {
  pos: number | null;
  firstName: string;
  lastName: string;
  firstNameCn: string;
  lastNameCn: string;
  code: string;
  number: number;
  team: string;
  teamCn: string;
  points: number;
  status: string;
  time?: string;
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
  raceResults: IRaceRound2026[];
  loading: boolean;
  error: Error | null;
}

export function useDynamic2026Data() {
  const [data, setData] = useState<DynamicDataState>({
    schedule: [],
    drivers: [],
    teams: [],
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

        setData({
          schedule: decorateSeason2026Assets(season2026Data.schedule, assetVersion),
          drivers: decorateSeason2026Assets(season2026Data.drivers2026, assetVersion),
          teams: decorateSeason2026Assets(season2026Data.teams2026, assetVersion),
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
