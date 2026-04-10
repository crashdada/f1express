function selectDriverColumn(
  availableColumns: Set<string> | null,
  column: string,
  fallbackSql = 'NULL'
) {
  if (!availableColumns || availableColumns.has(column)) {
    return `d.${column}`;
  }

  return `${fallbackSql} as ${column}`;
}

function hasColumn(availableColumns: Set<string> | null, column: string) {
  return !availableColumns || availableColumns.has(column);
}

export function buildDriversQuery(driverColumns: Set<string> | null = null) {
  return `
  SELECT 
    ${selectDriverColumn(driverColumns, 'driver_id')},
    ${selectDriverColumn(driverColumns, 'code')},
    ${selectDriverColumn(driverColumns, 'first_name')},
    ${selectDriverColumn(driverColumns, 'last_name')},
    ${selectDriverColumn(driverColumns, 'first_name_cn')},
    ${selectDriverColumn(driverColumns, 'last_name_cn')},
    ${selectDriverColumn(driverColumns, 'nationality')},
    ${selectDriverColumn(driverColumns, 'birth_date')},
    ${selectDriverColumn(driverColumns, 'birth_place')},
    ${selectDriverColumn(driverColumns, 'age')},
    ${selectDriverColumn(driverColumns, 'number', '0')},
    COALESCE(stats.total_points, 0) as total_points,
    COALESCE(stats.total_wins, 0) as total_wins,
    COALESCE(stats.total_podiums, 0) as total_podiums,
    COALESCE(stats.total_poles, 0) as total_poles,
    COALESCE(champ.championships, 0) as championships,
    COALESCE(champ.years, '') as championship_years,
    COALESCE(dp.url, '') as avatar,
    COALESCE(lt.color, '#6b7280') as team_color,
    COALESCE(lt.team_name, '') as team_name,
    COALESCE(lt.team_name_cn, '') as team_name_cn
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
    SELECT dss2.driver_id, t.color, t.name as team_name, t.name_cn as team_name_cn
    FROM driver_season_stats dss2
    JOIN teams t ON dss2.team_id = t.team_id
    WHERE (dss2.driver_id, dss2.season) IN (
      SELECT driver_id, MAX(season) FROM driver_season_stats GROUP BY driver_id
    )
    GROUP BY dss2.driver_id
  ) lt ON d.driver_id = lt.driver_id
  GROUP BY d.driver_id
  ORDER BY total_points DESC
`;
}

export const DRIVERS_QUERY = buildDriversQuery();

export function buildTeamsQuery(teamColumns: Set<string> | null = null) {
  const hiddenFilter = hasColumn(teamColumns, 'is_hidden') ? 'WHERE t.is_hidden = 0' : '';

  return `
  SELECT 
    t.team_id, t.name, t.name_cn, t.full_name, t.color,
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
  ${hiddenFilter}
  GROUP BY t.team_id
  ORDER BY total_points DESC
`;
}

export const TEAMS_QUERY = buildTeamsQuery();

export const RACE_RESULTS_QUERY = `
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
`;

export const DRIVER_CHAMPIONSHIPS_QUERY = 'SELECT driver_id, season, rank FROM driver_championships';

export const RACE_INFO_QUERY = `
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
`;

export const SEASON_STATS_QUERY = `
  SELECT r.season, d.first_name || ' ' || d.last_name as winner, t.name as team, COUNT(DISTINCT r.race_id) as races
  FROM races r JOIN race_results rr ON r.race_id = rr.race_id JOIN drivers d ON rr.driver_id = d.driver_id
  LEFT JOIN teams t ON rr.team_id = t.team_id WHERE rr.position = 1 GROUP BY r.season ORDER BY r.season DESC
`;
