const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function getPathFromEnv(envKey, fallbackPath) {
  return process.env[envKey] || fallbackPath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file missing: ${filePath}`);
  }
}

function normalizeTeamToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.()]/g, '')
    .trim();
}

function normalizeFamilyId(value) {
  return normalizeTeamToken(String(value || '').replace(/family$/i, ''));
}

function buildTeamLookups(teamIdentityRecords) {
  const aliasLookup = new Map();
  const idLookup = new Map();

  for (const record of teamIdentityRecords) {
    const familyId = String(record.familyId || record.canonicalId || '').trim();
    if (!familyId) {
      continue;
    }

    const familyTokens = new Set([
      familyId,
      normalizeFamilyId(familyId),
      String(record.canonicalId || '').trim(),
      normalizeFamilyId(record.canonicalId || ''),
    ]);

    for (const token of familyTokens) {
      const normalized = normalizeTeamToken(token);
      if (normalized) {
        idLookup.set(normalized, familyId);
      }
    }

    const aliasCandidates = [
      record?.name?.en,
      record?.name?.zh,
      record?.display?.short,
      ...(record.aliases || []),
      ...(record.sourceKeys || []),
    ];

    for (const alias of aliasCandidates) {
      const normalized = normalizeTeamToken(alias);
      if (normalized) {
        aliasLookup.set(normalized, familyId);
      }
    }
  }

  return { aliasLookup, idLookup };
}

function resolveFamilyId(value, idLookup, aliasLookup) {
  const normalized = normalizeTeamToken(value);
  return idLookup.get(normalized) || aliasLookup.get(normalized) || '';
}

function buildHistoricalTotalsByFamily(dbPath, aliasLookup) {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare(`
    SELECT t.name, COALESCE(SUM(tss.points), 0) AS points
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.team_id = tss.team_id
    GROUP BY t.team_id, t.name
  `).all();
  db.close();

  const totals = new Map();

  for (const row of rows) {
    const familyId = resolveFamilyId(row.name, new Map(), aliasLookup);
    if (!familyId) {
      continue;
    }

    totals.set(familyId, Number(totals.get(familyId) || 0) + Number(row.points || 0));
  }

  return totals;
}

function buildLiveTotalsByFamily(results2026, aliasLookup) {
  const totals = new Map();

  for (const round of results2026) {
    for (const key of ['results', 'sprintResults']) {
      for (const item of round[key] || []) {
        const familyId = resolveFamilyId(item.team, new Map(), aliasLookup);
        if (!familyId) {
          continue;
        }

        totals.set(familyId, Number(totals.get(familyId) || 0) + Number(item.points || 0));
      }
    }
  }

  return totals;
}

function compareTeamTotals(historicalTotals, liveTotals, teams2026, idLookup, aliasLookup) {
  const issues = [];

  for (const team of teams2026) {
    const familyId =
      resolveFamilyId(team.id, idLookup, aliasLookup) ||
      resolveFamilyId(team.familyId, idLookup, aliasLookup) ||
      resolveFamilyId(team.name, idLookup, aliasLookup);

    if (!familyId) {
      continue;
    }

    const historical = Number(historicalTotals.get(familyId) || 0);
    const live = Number(liveTotals.get(familyId) || 0);
    const actual = Number(team?.stats?.points || 0);
    const expected = historical + live;

    if (Math.abs(actual - expected) > 1e-9) {
      issues.push(
        `${team.name || familyId}: expected ${expected}, got ${actual} (historical ${historical} + live ${live})`
      );
    }
  }

  return issues;
}

function assertJsonEqual(leftPath, rightPath) {
  const left = fs.readFileSync(leftPath, 'utf-8');
  const right = fs.readFileSync(rightPath, 'utf-8');
  if (left !== right) {
    throw new Error(`JSON artifact drift detected: ${leftPath} != ${rightPath}`);
  }
}

function assertBinaryEqual(leftPath, rightPath) {
  const left = fs.readFileSync(leftPath);
  const right = fs.readFileSync(rightPath);
  if (!left.equals(right)) {
    throw new Error(`Binary artifact drift detected: ${leftPath} != ${rightPath}`);
  }
}

function main() {
  const repoRoot = process.cwd();
  const storageRoot = getPathFromEnv('F1_STORAGE_ROOT', path.join(repoRoot, 'storage'));
  const distRoot = getPathFromEnv('F1_DIST_ROOT', path.join(repoRoot, 'dist'));
  const collectorDataRoot = getPathFromEnv('F1_COLLECTOR_DATA_ROOT', path.join(repoRoot, 'collector', 'data'));
  const teamIdentityPath = getPathFromEnv(
    'F1_TEAM_IDENTITY_PATH',
    path.join(repoRoot, 'src', 'data', 'identity', 'teams.json')
  );

  const storageDbPath = path.join(storageRoot, 'f1.db');
  const storageResultsPath = path.join(storageRoot, 'results_2026.json');
  const storageTeamsPath = path.join(storageRoot, 'teams_2026.json');
  const distDbPath = path.join(distRoot, 'f1.db');
  const distTeamsPath = path.join(distRoot, 'data', 'teams_2026.json');
  const collectorTeamsPath = path.join(collectorDataRoot, 'teams_2026.json');

  [
    storageDbPath,
    storageResultsPath,
    storageTeamsPath,
    distDbPath,
    distTeamsPath,
    collectorTeamsPath,
    teamIdentityPath,
  ].forEach(assertFileExists);

  const teamIdentityRecords = readJson(teamIdentityPath);
  const { aliasLookup, idLookup } = buildTeamLookups(teamIdentityRecords);
  const historicalTotals = buildHistoricalTotalsByFamily(storageDbPath, aliasLookup);
  const liveTotals = buildLiveTotalsByFamily(readJson(storageResultsPath), aliasLookup);
  const storageTeams = readJson(storageTeamsPath);

  const issues = compareTeamTotals(historicalTotals, liveTotals, storageTeams, idLookup, aliasLookup);
  if (issues.length > 0) {
    throw new Error(`Team total validation failed:\n${issues.join('\n')}`);
  }

  assertJsonEqual(storageTeamsPath, collectorTeamsPath);
  assertJsonEqual(storageTeamsPath, distTeamsPath);
  assertBinaryEqual(storageDbPath, distDbPath);

  process.stdout.write('Team totals validation passed.\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
