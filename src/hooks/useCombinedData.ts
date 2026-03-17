import { useMemo } from 'react';
import { useF1 } from '../context/F1Context';
import { useDynamic2026Data } from './useDynamic2026Data';
import { Team, Driver } from '../types';

export function useCombinedData() {
  const { state } = useF1();
  const { raceResults: liveResults } = useDynamic2026Data();

  const combinedTeams = useMemo(() => {
    const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number; teamEn: string }>();
    if (liveResults && liveResults.length > 0) {
      liveResults.forEach(r => {
        if (r.polePosition && r.polePosition.code) {
          const poleDriver = r.results.find(res => res.code === r.polePosition!.code);
          if (poleDriver && poleDriver.team) {
            const teamCn = poleDriver.teamCn || poleDriver.team;
            if (!liveStatsMap.has(teamCn)) {
              liveStatsMap.set(teamCn, { points: 0, wins: 0, podiums: 0, poles: 0, teamEn: poleDriver.team });
            }
            liveStatsMap.get(teamCn)!.poles += 1;
          }
        }

        r.results.forEach(res => {
          const teamCn = res.teamCn || res.team;
          if (!liveStatsMap.has(teamCn)) {
            liveStatsMap.set(teamCn, { points: 0, wins: 0, podiums: 0, poles: 0, teamEn: res.team });
          }
          const stats = liveStatsMap.get(teamCn)!;
          stats.points += res.points || 0;
          if (res.pos === 1) stats.wins += 1;
          if (res.pos && res.pos <= 3) stats.podiums += 1;
        });

        if (r.sprintResults) {
          r.sprintResults.forEach(res => {
            const teamCn = res.teamCn || res.team;
            if (!liveStatsMap.has(teamCn)) {
              liveStatsMap.set(teamCn, { points: 0, wins: 0, podiums: 0, poles: 0, teamEn: res.team });
            }
            const stats = liveStatsMap.get(teamCn)!;
            stats.points += res.points || 0;
          });
        }
      });
    }

    return state.teams.map(team => {
      let liveStats = liveStatsMap.get(team.name) || liveStatsMap.get(team.nameCn);

      if (!liveStats) {
        for (const [key, value] of liveStatsMap.entries()) {
          const enName = value.teamEn;
          if (team.name.includes(key) || key.includes(team.name) ||
            (enName && (enName.includes(team.fullName) || team.fullName.includes(enName)))) {
            liveStats = value;
            break;
          }
        }
      }

      if (!liveStats) return team;
      return {
        ...team,
        points: (team.points || 0) + liveStats.points,
        wins: (team.wins || 0) + liveStats.wins,
        podiums: (team.podiums || 0) + liveStats.podiums,
        poles: (team.poles || 0) + liveStats.poles,
      } as Team;
    }).sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [state.teams, liveResults]);

  const combinedDrivers = useMemo(() => {
    const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number }>();
    if (liveResults && liveResults.length > 0) {
      liveResults.forEach(r => {
        r.results.forEach(res => {
          if (!liveStatsMap.has(res.code)) {
            liveStatsMap.set(res.code, { points: 0, wins: 0, podiums: 0, poles: 0 });
          }
          const stats = liveStatsMap.get(res.code)!;
          stats.points += res.points || 0;
          if (res.pos === 1) stats.wins += 1;
          if (res.pos && res.pos <= 3) stats.podiums += 1;
        });

        if (r.sprintResults) {
          r.sprintResults.forEach(res => {
            if (!liveStatsMap.has(res.code)) {
              liveStatsMap.set(res.code, { points: 0, wins: 0, podiums: 0, poles: 0 });
            }
            liveStatsMap.get(res.code)!.points += res.points || 0;
          });
        }

        if (r.polePosition?.code) {
          if (!liveStatsMap.has(r.polePosition.code)) {
            liveStatsMap.set(r.polePosition.code, { points: 0, wins: 0, podiums: 0, poles: 0 });
          }
          liveStatsMap.get(r.polePosition.code)!.poles += 1;
        }
      });
    }

    return state.drivers.map(driver => {
      const live = liveStatsMap.get(driver.code);
      if (!live) return driver;
      return {
        ...driver,
        points: (driver.points || 0) + live.points,
        wins: (driver.wins || 0) + live.wins,
        podiums: (driver.podiums || 0) + live.podiums,
        poles: (driver.poles || 0) + live.poles,
      } as Driver;
    }).sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [state.drivers, liveResults]);

  return { combinedTeams, combinedDrivers, liveResults, loading: state.loading };
}
