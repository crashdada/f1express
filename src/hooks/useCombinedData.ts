import { useMemo } from 'react';
import { useF1 } from '../context/F1Context';
import { useDynamic2026Data, IRaceRound2026 } from './useDynamic2026Data';
import { Driver, Team } from '../types';
import { getDriverMatchKeys, getTeamMatchKeys } from '../utils/entityMappings';

type TeamWithActive = Team & { isActive2026?: boolean };
type DriverWithActive = Driver & { isActive2026?: boolean };

function hasChineseCharacter(value?: string | null) {
  return /[\u4e00-\u9fff]/.test(value || '');
}

function getEnglishLikeValues(...values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value) && !hasChineseCharacter(value));
}

function getChineseLikeValues(...values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value) && hasChineseCharacter(value));
}

function getEnglishTeamKeys(team: {
  name?: string | null;
  fullName?: string | null;
}) {
  return getEnglishLikeValues(team.name, team.fullName).flatMap((value) => getTeamMatchKeys(value));
}

function getChineseTeamKeys(team: {
  name?: string | null;
  nameCn?: string | null;
}) {
  return getChineseLikeValues(team.nameCn, team.name).flatMap((value) => getTeamMatchKeys(value));
}

function matchesLiveTeam(
  team: Pick<Team, 'name' | 'nameCn' | 'fullName'>,
  liveTeam: { name?: string | null; nameCn?: string | null }
) {
  const teamEnglishKeys = getEnglishTeamKeys(team);
  const liveEnglishKeys = getEnglishTeamKeys({ name: liveTeam.name });

  if (teamEnglishKeys.length > 0 && liveEnglishKeys.length > 0) {
    return intersects(teamEnglishKeys, liveEnglishKeys);
  }

  const teamChineseKeys = getChineseTeamKeys(team);
  const liveChineseKeys = getChineseTeamKeys({ name: liveTeam.name, nameCn: liveTeam.nameCn });

  return teamChineseKeys.length > 0 && liveChineseKeys.length > 0
    ? intersects(teamChineseKeys, liveChineseKeys)
    : false;
}

function intersects(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function buildLiveTeamStatsMap(liveResults: IRaceRound2026[]) {
  const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number }>();

  const ensureTeam = (keys: string[]) => {
    const primaryKey = keys[0];
    if (!primaryKey) {
      return null;
    }

    if (!liveStatsMap.has(primaryKey)) {
      liveStatsMap.set(primaryKey, { points: 0, wins: 0, podiums: 0, poles: 0 });
    }

    keys.slice(1).forEach((key) => {
      if (key && !liveStatsMap.has(key)) {
        liveStatsMap.set(key, liveStatsMap.get(primaryKey)!);
      }
    });

    return liveStatsMap.get(primaryKey)!;
  };

  liveResults.forEach((round) => {
    if (round.polePosition) {
      const poleDriver = round.results.find((result) =>
        intersects(getDriverMatchKeys(result), getDriverMatchKeys(round.polePosition))
      );
      if (poleDriver) {
        const stats = ensureTeam(getTeamMatchKeys(poleDriver.team, poleDriver.teamCn));
        if (stats) {
          stats.poles += 1;
        }
      }
    }

    round.results.forEach((result) => {
      const stats = ensureTeam(getTeamMatchKeys(result.team, result.teamCn));
      if (!stats) {
        return;
      }

      stats.points += result.points || 0;
      if (result.pos === 1) stats.wins += 1;
      if (result.pos && result.pos <= 3) stats.podiums += 1;
    });

    round.sprintResults?.forEach((result) => {
      const stats = ensureTeam(getTeamMatchKeys(result.team, result.teamCn));
      if (stats) {
        stats.points += result.points || 0;
      }
    });
  });

  return liveStatsMap;
}

function buildLiveDriverStatsMap(liveResults: IRaceRound2026[]) {
  const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number }>();

  const ensureDriver = (keys: string[]) => {
    const primaryKey = keys[0];
    if (!primaryKey) {
      return null;
    }

    if (!liveStatsMap.has(primaryKey)) {
      liveStatsMap.set(primaryKey, { points: 0, wins: 0, podiums: 0, poles: 0 });
    }

    keys.slice(1).forEach((key) => {
      if (key && !liveStatsMap.has(key)) {
        liveStatsMap.set(key, liveStatsMap.get(primaryKey)!);
      }
    });

    return liveStatsMap.get(primaryKey)!;
  };

  liveResults.forEach((round) => {
    round.results.forEach((result) => {
      const stats = ensureDriver(getDriverMatchKeys(result));
      if (!stats) {
        return;
      }

      stats.points += result.points || 0;
      if (result.pos === 1) stats.wins += 1;
      if (result.pos && result.pos <= 3) stats.podiums += 1;
    });

    round.sprintResults?.forEach((result) => {
      const stats = ensureDriver(getDriverMatchKeys(result));
      if (stats) {
        stats.points += result.points || 0;
      }
    });

    if (round.polePosition) {
      const stats = ensureDriver(getDriverMatchKeys(round.polePosition));
      if (stats) {
        stats.poles += 1;
      }
    }
  });

  return liveStatsMap;
}

export function useCombinedData() {
  const { state } = useF1();
  const { raceResults: liveResults, teams: liveTeams, drivers: liveDrivers } = useDynamic2026Data();

  const activeDriverKeys = useMemo(
    () => new Set(liveDrivers.flatMap((driver) => getDriverMatchKeys(driver))),
    [liveDrivers]
  );

  const activeTeamKeys = useMemo(
    () => new Set(liveTeams.flatMap((team) => getTeamMatchKeys(team.name, team.nameCn))),
    [liveTeams]
  );

  const combinedTeams = useMemo(() => {
    // Teams page follows the product ranking rule, not the validator-only DB rule:
    // - validation scripts compare historical DB aggregates in team_season_stats
    // - runtime standings show historical totals overlaid with the current 2026 live season
    // Example: Ferrari = 11521 (DB historical total) + 67 (2026 live race/sprint points) = 11588.
    const liveTeamStatsMap = buildLiveTeamStatsMap(liveResults);

    const mergedTeams = state.teams.map((team) => {
      const teamKeys = getTeamMatchKeys(team.name, team.nameCn, team.fullName);
      const isActive2026 = liveTeams.some((liveTeam) => matchesLiveTeam(team, liveTeam));
      const liveStats = teamKeys.map((key) => liveTeamStatsMap.get(key)).find(Boolean);

      if (!liveStats) {
        return {
          ...team,
          isActive2026,
        } as TeamWithActive;
      }

      return {
        ...team,
        points: (team.points || 0) + liveStats.points,
        wins: (team.wins || 0) + liveStats.wins,
        podiums: (team.podiums || 0) + liveStats.podiums,
        poles: (team.poles || 0) + liveStats.poles,
        isActive2026,
      } as TeamWithActive;
    });

    const liveOnlyTeams = liveTeams.flatMap((team2026) => {
      const candidateKeys = getTeamMatchKeys(team2026.name, team2026.nameCn);

      if (mergedTeams.some((team) => matchesLiveTeam(team, team2026))) {
        return [];
      }

      const liveStats = candidateKeys.map((key) => liveTeamStatsMap.get(key)).find(Boolean);

      return [{
        id: team2026.id || team2026.name,
        name: team2026.name,
        fullName: team2026.name,
        nameCn: team2026.nameCn || team2026.name,
        points: Number(liveStats?.points || 0),
        wins: Number(liveStats?.wins || 0),
        podiums: Number(liveStats?.podiums || 0),
        poles: Number(liveStats?.poles || 0),
        championships: 0,
        driverChampionships: 0,
        championshipYears: [],
        color: team2026.color || '#e10600',
        logo: team2026.logo || '',
        isActive2026: true,
      } as TeamWithActive];
    });

    return [...mergedTeams, ...liveOnlyTeams].sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [liveResults, liveTeams, state.teams]);

  const combinedDrivers = useMemo(() => {
    const liveDriverStatsMap = buildLiveDriverStatsMap(liveResults);

    const mergedDrivers = state.drivers
      .map((driver) => {
        const driverKeys = getDriverMatchKeys(driver);
        const isActive2026 = intersects(driverKeys, [...activeDriverKeys]);
        const liveStats = driverKeys.map((key) => liveDriverStatsMap.get(key)).find(Boolean);

        if (!liveStats) {
          return {
            ...driver,
            isActive2026,
          } as DriverWithActive;
        }

        return {
          ...driver,
          points: (driver.points || 0) + liveStats.points,
          wins: (driver.wins || 0) + liveStats.wins,
          podiums: (driver.podiums || 0) + liveStats.podiums,
          poles: (driver.poles || 0) + liveStats.poles,
          isActive2026,
        } as DriverWithActive;
      })
    ;

    const liveOnlyDrivers = liveDrivers.flatMap((driver2026) => {
      const candidateKeys = getDriverMatchKeys(driver2026);

      if (mergedDrivers.some((driver) => intersects(getDriverMatchKeys(driver), candidateKeys))) {
        return [];
      }

      const liveStats = candidateKeys.map((key) => liveDriverStatsMap.get(key)).find(Boolean);

      return [{
        id: driver2026.id || driver2026.code,
        number: driver2026.number || 0,
        firstName: driver2026.firstName || '',
        lastName: driver2026.lastName || '',
        firstNameCn: driver2026.firstNameCn || '',
        lastNameCn: driver2026.lastNameCn || '',
        code: driver2026.code || '',
        team: driver2026.teamCn || driver2026.team || '',
        nationality: driver2026.country || '',
        points: Number(liveStats?.points || 0),
        wins: Number(liveStats?.wins || 0),
        podiums: Number(liveStats?.podiums || 0),
        poles: Number(liveStats?.poles || 0),
        championships: 0,
        championshipYears: [],
        avatar: driver2026.image || '',
        teamColor: liveTeams.find((team) => getTeamMatchKeys(team.name, team.nameCn).some((key) => getTeamMatchKeys(driver2026.team, driver2026.teamCn).includes(key)))?.color || '#6b7280',
        age: driver2026.age,
        isActive2026: true,
      } as DriverWithActive];
    });

    return [...mergedDrivers, ...liveOnlyDrivers]
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [activeDriverKeys, liveDrivers, liveResults, liveTeams, state.drivers]);

  return {
    combinedTeams,
    combinedDrivers,
    activeDriverKeys,
    activeTeamKeys,
    liveResults,
    loading: state.loading,
  };
}
