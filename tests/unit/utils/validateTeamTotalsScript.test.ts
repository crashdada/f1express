import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

const createdDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1-team-totals-'));
  createdDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createDb(dbPath: string, historicalPoints: Array<{ name: string; points: number }>) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE teams (
      team_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE team_season_stats (
      stat_id INTEGER PRIMARY KEY,
      team_id INTEGER NOT NULL,
      points REAL NOT NULL
    );
  `);

  historicalPoints.forEach((team, index) => {
    const teamId = index + 1;
    db.prepare('INSERT INTO teams(team_id, name) VALUES (?, ?)').run(teamId, team.name);
    db.prepare('INSERT INTO team_season_stats(stat_id, team_id, points) VALUES (?, ?, ?)')
      .run(teamId, teamId, team.points);
  });

  db.close();
}

function runValidation(env: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ['scripts/validate_team_totals.cjs'],
    {
      cwd: path.resolve(__dirname, '../../..'),
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf-8',
    }
  );
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('validate_team_totals script', () => {
  it('fails when team totals drift from history plus 2026 live points', () => {
    const root = makeTempDir();
    const storageRoot = path.join(root, 'storage');
    const distRoot = path.join(root, 'dist');
    const collectorRoot = path.join(root, 'collector-data');
    const dbPath = path.join(storageRoot, 'f1.db');

    createDb(dbPath, [{ name: 'Ferrari', points: 100 }]);
    writeJson(path.join(storageRoot, 'results_2026.json'), [
      { results: [{ team: 'Ferrari', points: 25 }], sprintResults: [] },
    ]);
    writeJson(path.join(storageRoot, 'teams_2026.json'), [
      { name: 'Ferrari', stats: { points: 120 } },
    ]);

    fs.mkdirSync(path.dirname(path.join(distRoot, 'f1.db')), { recursive: true });
    fs.copyFileSync(dbPath, path.join(distRoot, 'f1.db'));
    writeJson(path.join(distRoot, 'data', 'teams_2026.json'), [
      { name: 'Ferrari', stats: { points: 120 } },
    ]);
    writeJson(path.join(collectorRoot, 'teams_2026.json'), [
      { name: 'Ferrari', stats: { points: 120 } },
    ]);

    const result = runValidation({
      F1_STORAGE_ROOT: storageRoot,
      F1_DIST_ROOT: distRoot,
      F1_COLLECTOR_DATA_ROOT: collectorRoot,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toContain('Ferrari');
  });

  it('passes when storage, collector, and dist team totals stay in sync', () => {
    const root = makeTempDir();
    const storageRoot = path.join(root, 'storage');
    const distRoot = path.join(root, 'dist');
    const collectorRoot = path.join(root, 'collector-data');
    const dbPath = path.join(storageRoot, 'f1.db');

    createDb(dbPath, [{ name: 'Ferrari', points: 100 }]);
    const teamsPayload = [{ name: 'Ferrari', stats: { points: 125 } }];
    writeJson(path.join(storageRoot, 'results_2026.json'), [
      { results: [{ team: 'Ferrari', points: 25 }], sprintResults: [] },
    ]);
    writeJson(path.join(storageRoot, 'teams_2026.json'), teamsPayload);

    fs.mkdirSync(path.dirname(path.join(distRoot, 'f1.db')), { recursive: true });
    fs.copyFileSync(dbPath, path.join(distRoot, 'f1.db'));
    writeJson(path.join(distRoot, 'data', 'teams_2026.json'), teamsPayload);
    writeJson(path.join(collectorRoot, 'teams_2026.json'), teamsPayload);

    const result = runValidation({
      F1_STORAGE_ROOT: storageRoot,
      F1_DIST_ROOT: distRoot,
      F1_COLLECTOR_DATA_ROOT: collectorRoot,
    });

    expect(result.status).toBe(0);
  });

  it('uses the identity registry instead of a hardcoded team family map', () => {
    const root = makeTempDir();
    const storageRoot = path.join(root, 'storage');
    const distRoot = path.join(root, 'dist');
    const collectorRoot = path.join(root, 'collector-data');
    const identityPath = path.join(root, 'identity', 'teams.json');
    const dbPath = path.join(storageRoot, 'f1.db');

    createDb(dbPath, [{ name: 'Scuderia Ferrari', points: 100 }]);
    const teamsPayload = [{ id: 'ferrari-family', name: 'Ferrari', stats: { points: 125 } }];

    writeJson(identityPath, [
      {
        canonicalId: 'ferrari',
        familyId: 'ferrari-family',
        name: { en: 'Ferrari', zh: '法拉利' },
        display: { short: 'Ferrari' },
        aliases: ['Ferrari', 'Scuderia Ferrari'],
        sourceKeys: ['Ferrari', 'Scuderia Ferrari'],
        activeRanges: [],
      },
    ]);
    writeJson(path.join(storageRoot, 'results_2026.json'), [
      { results: [{ team: 'Scuderia Ferrari', points: 25 }], sprintResults: [] },
    ]);
    writeJson(path.join(storageRoot, 'teams_2026.json'), teamsPayload);

    fs.mkdirSync(path.dirname(path.join(distRoot, 'f1.db')), { recursive: true });
    fs.copyFileSync(dbPath, path.join(distRoot, 'f1.db'));
    writeJson(path.join(distRoot, 'data', 'teams_2026.json'), teamsPayload);
    writeJson(path.join(collectorRoot, 'teams_2026.json'), teamsPayload);

    const result = runValidation({
      F1_STORAGE_ROOT: storageRoot,
      F1_DIST_ROOT: distRoot,
      F1_COLLECTOR_DATA_ROOT: collectorRoot,
      F1_TEAM_IDENTITY_PATH: identityPath,
    });

    expect(result.status).toBe(0);
  });
});
