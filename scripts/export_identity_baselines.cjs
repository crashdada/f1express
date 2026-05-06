const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const rootDir = path.resolve(__dirname, '..');
const storageDir = path.join(rootDir, 'storage');
const baselinesDir = path.join(rootDir, 'docs', 'baselines');

function normalizeIdentityText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.·'()]/g, '');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function loadIdentity() {
  return {
    drivers: readJson('src/data/identity/drivers.json'),
    teams: readJson('src/data/identity/teams.json'),
  };
}

function buildDriverIndex(drivers) {
  const index = new Map();
  for (const driver of drivers) {
    const keys = new Set([
      normalizeIdentityText(`${driver.name.en.first} ${driver.name.en.last}`),
      normalizeIdentityText(`${driver.name.zh.first}${driver.name.zh.last}`),
      ...driver.aliases.map((alias) => normalizeIdentityText(alias)),
      ...driver.codes.map((code) => `code:${normalizeIdentityText(code)}`),
    ]);
    for (const key of keys) {
      if (key && !index.has(key)) {
        index.set(key, driver);
      }
    }
  }
  return index;
}

function buildTeamIndex(teams) {
  const index = new Map();
  for (const team of teams) {
    const rawValues = [team.name.en, team.name.zh, ...team.aliases, ...team.sourceKeys];
    for (const value of rawValues) {
      const keys = [
        normalizeIdentityText(value),
        normalizeIdentityText(String(value || '').replace(/\bF1 Team\b/gi, '').replace(/\bTeam\b/gi, '').replace(/\bAMG\b/gi, '').trim()),
      ];
      for (const key of keys) {
        if (key && !index.has(key)) {
          index.set(key, team);
        }
      }
    }
  }
  return index;
}

function resolveDriver(index, input) {
  const keys = [
    normalizeIdentityText(`${input.firstName || ''} ${input.lastName || ''}`),
    normalizeIdentityText(`${input.firstNameCn || ''}${input.lastNameCn || ''}`),
    input.code ? `code:${normalizeIdentityText(input.code)}` : '',
  ];
  return keys.map((key) => index.get(key)).find(Boolean) || null;
}

function resolveTeam(index, input) {
  const values = [input.name, input.nameCn, input.fullName];
  const keys = values.flatMap((value) => [
    normalizeIdentityText(value),
    normalizeIdentityText(String(value || '').replace(/\bF1 Team\b/gi, '').replace(/\bTeam\b/gi, '').replace(/\bAMG\b/gi, '').trim()),
  ]);
  return keys.map((key) => index.get(key)).find(Boolean) || null;
}

function queryHistoricalDrivers(db, driverIndex) {
  const rows = db.prepare(`
    SELECT
      d.driver_id,
      d.first_name,
      d.last_name,
      d.first_name_cn,
      d.last_name_cn,
      d.code,
      COALESCE(SUM(s.points), 0) AS historical_points,
      COALESCE(SUM(s.wins), 0) AS wins,
      COALESCE(SUM(s.podiums), 0) AS podiums,
      COALESCE(SUM(s.poles), 0) AS poles
    FROM drivers d
    LEFT JOIN driver_season_stats s ON s.driver_id = d.driver_id
    GROUP BY d.driver_id
  `).all();

  const result = new Map();
  for (const row of rows) {
    const resolved = resolveDriver(driverIndex, {
      firstName: row.first_name,
      lastName: row.last_name,
      firstNameCn: row.first_name_cn,
      lastNameCn: row.last_name_cn,
      code: row.code,
    });
    const key = resolved?.canonicalId || `db-driver-${row.driver_id}`;
    const current = result.get(key) || {
      canonicalId: key,
      displayName: resolved ? `${resolved.name.zh.first}${resolved.name.zh.last}` || `${resolved.name.en.first} ${resolved.name.en.last}` : `${row.first_name} ${row.last_name}`,
      code: row.code || '',
      historicalPoints: 0,
      live2026Points: 0,
      totalPoints: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
    };
    current.historicalPoints += Number(row.historical_points || 0);
    current.wins += Number(row.wins || 0);
    current.podiums += Number(row.podiums || 0);
    current.poles += Number(row.poles || 0);
    result.set(key, current);
  }
  return result;
}

function queryHistoricalTeams(db, teamIndex) {
  const rows = db.prepare(`
    SELECT
      t.team_id,
      t.name,
      t.name_cn,
      t.full_name,
      COALESCE(SUM(s.points), 0) AS historical_points,
      COALESCE(SUM(s.wins), 0) AS wins,
      COALESCE(SUM(s.podiums), 0) AS podiums,
      COALESCE(SUM(s.poles), 0) AS poles
    FROM teams t
    LEFT JOIN team_season_stats s ON s.team_id = t.team_id
    GROUP BY t.team_id
  `).all();

  const result = new Map();
  for (const row of rows) {
    const resolved = resolveTeam(teamIndex, {
      name: row.name,
      nameCn: row.name_cn,
      fullName: row.full_name,
    });
    const key = resolved?.familyId || resolved?.canonicalId || `db-team-${row.team_id}`;
    const current = result.get(key) || {
      familyId: key,
      displayName: resolved?.name.zh || resolved?.display.short || row.name,
      historicalPoints: 0,
      live2026Points: 0,
      totalPoints: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
    };
    current.historicalPoints += Number(row.historical_points || 0);
    current.wins += Number(row.wins || 0);
    current.podiums += Number(row.podiums || 0);
    current.poles += Number(row.poles || 0);
    result.set(key, current);
  }
  return result;
}

function accumulateLiveDriverPoints(driverMap, driverIndex, liveResults) {
  for (const round of liveResults) {
    for (const bucket of [round.results || [], round.sprintResults || []]) {
      for (const result of bucket) {
        const resolved = resolveDriver(driverIndex, result);
        const key = resolved?.canonicalId || normalizeIdentityText(`${result.firstName || ''} ${result.lastName || ''}`);
        if (!driverMap.has(key)) {
          driverMap.set(key, {
            canonicalId: key,
            displayName: resolved ? `${resolved.name.zh.first}${resolved.name.zh.last}` : `${result.firstName || ''} ${result.lastName || ''}`.trim(),
            code: result.code || '',
            historicalPoints: 0,
            live2026Points: 0,
            totalPoints: 0,
            wins: 0,
            podiums: 0,
            poles: 0,
          });
        }
        const entry = driverMap.get(key);
        entry.live2026Points += Number(result.points || 0);
      }
    }
  }
}

function accumulateLiveTeamPoints(teamMap, teamIndex, liveResults) {
  for (const round of liveResults) {
    for (const bucket of [round.results || [], round.sprintResults || []]) {
      for (const result of bucket) {
        const resolved = resolveTeam(teamIndex, { name: result.team, nameCn: result.teamCn, fullName: result.team });
        const key = resolved?.familyId || resolved?.canonicalId || normalizeIdentityText(result.team);
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            familyId: key,
            displayName: resolved?.name.zh || result.teamCn || result.team || key,
            historicalPoints: 0,
            live2026Points: 0,
            totalPoints: 0,
            wins: 0,
            podiums: 0,
            poles: 0,
          });
        }
        const entry = teamMap.get(key);
        entry.live2026Points += Number(result.points || 0);
      }
    }
  }
}

function finalizeEntries(map, idKey) {
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      totalPoints: Number((entry.historicalPoints + entry.live2026Points).toFixed(1)),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
      [idKey]: entry[idKey],
    }));
}

function buildBaselinePayloads() {
  const generatedAt = new Date().toISOString();
  const identity = loadIdentity();
  const driverIndex = buildDriverIndex(identity.drivers);
  const teamIndex = buildTeamIndex(identity.teams);
  const db = new Database(path.join(storageDir, 'f1.db'), { readonly: true });
  const liveResults = readJson('storage/results_2026.json');

  const historicalDrivers = queryHistoricalDrivers(db, driverIndex);
  const historicalTeams = queryHistoricalTeams(db, teamIndex);

  accumulateLiveDriverPoints(historicalDrivers, driverIndex, liveResults);
  accumulateLiveTeamPoints(historicalTeams, teamIndex, liveResults);

  const driverEntries = finalizeEntries(historicalDrivers, 'canonicalId');
  const teamEntries = finalizeEntries(historicalTeams, 'familyId');
  db.close();

  return {
    driverTotals: { generatedAt, entries: driverEntries },
    teamTotals: { generatedAt, entries: teamEntries },
    driverStandingsView: {
      generatedAt,
      entries: driverEntries.map(({ rank, canonicalId, displayName, code, totalPoints }) => ({
        rank,
        canonicalId,
        displayName,
        code,
        totalPoints,
      })),
    },
    teamStandingsView: {
      generatedAt,
      entries: teamEntries.map(({ rank, familyId, displayName, totalPoints }) => ({
        rank,
        familyId,
        displayName,
        totalPoints,
      })),
    },
  };
}

function writeBaselines() {
  const payloads = buildBaselinePayloads();
  fs.mkdirSync(baselinesDir, { recursive: true });
  fs.writeFileSync(path.join(baselinesDir, '2026-05-06-driver-totals.json'), JSON.stringify(payloads.driverTotals, null, 2) + '\n');
  fs.writeFileSync(path.join(baselinesDir, '2026-05-06-team-totals.json'), JSON.stringify(payloads.teamTotals, null, 2) + '\n');
  fs.writeFileSync(path.join(baselinesDir, '2026-05-06-driver-standings-view.json'), JSON.stringify(payloads.driverStandingsView, null, 2) + '\n');
  fs.writeFileSync(path.join(baselinesDir, '2026-05-06-team-standings-view.json'), JSON.stringify(payloads.teamStandingsView, null, 2) + '\n');
  return payloads;
}

module.exports = {
  buildBaselinePayloads,
  writeBaselines,
};

if (require.main === module) {
  writeBaselines();
}
