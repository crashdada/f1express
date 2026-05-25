const express = require('express');
const fs = require('fs');
const path = require('path');
const { STORAGE_ROOT } = require('../config.cjs');

const router = express.Router();

const RUNTIME_DATA_FILES = new Set([
  'schedule_2026.json',
  'results_2026.json',
  'drivers_2026.json',
  'teams_2026.json',
]);

const DEFAULT_REMOTE_DATA_BASE_URL = 'https://raw.githubusercontent.com/crashdada/f1express/main/storage';

function getRemoteDataBaseUrl() {
  return (process.env.F1EXPRESS_RUNTIME_DATA_BASE_URL || DEFAULT_REMOTE_DATA_BASE_URL).replace(/\/+$/, '');
}

function getGitHubToken() {
  return (process.env.F1EXPRESS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();
}

function buildRemoteHeaders() {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'f1express-runtime-data-sync',
  };
  const token = getGitHubToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function writeRuntimeDataFile(filename, jsonText) {
  const target = path.join(STORAGE_ROOT, filename);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;

  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.writeFileSync(tmp, `${jsonText.trim()}\n`, 'utf8');
  fs.renameSync(tmp, target);
}

async function fetchRemoteRuntimeData(filename) {
  const response = await fetch(`${getRemoteDataBaseUrl()}/${filename}`, {
    cache: 'no-store',
    headers: buildRemoteHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Remote runtime data request failed: ${response.status}`);
  }

  const text = await response.text();
  const parsed = JSON.parse(text);

  return JSON.stringify(parsed, null, 2);
}

router.get('/:filename', async (req, res, next) => {
  const { filename } = req.params;

  if (!RUNTIME_DATA_FILES.has(filename)) {
    return next();
  }

  try {
    const jsonText = await fetchRemoteRuntimeData(filename);
    writeRuntimeDataFile(filename, jsonText);
    return res.type('application/json').send(jsonText);
  } catch (error) {
    console.warn(`[Runtime Data] Failed to refresh ${filename}:`, error.message);
    return next();
  }
});

module.exports = router;
