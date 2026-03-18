const express = require('express');
const fs = require('fs');
const path = require('path');
const { PHOTOS_ROOT, STORAGE_ROOT } = require('../config.cjs');
const pkg = require('../../package.json');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbPath = path.join(STORAGE_ROOT, 'f1.db');
  const dbReady = fs.existsSync(dbPath);
  const photosReady = fs.existsSync(PHOTOS_ROOT);
  const healthy = dbReady && photosReady;
  const dbStats = dbReady ? fs.statSync(dbPath) : null;

  return res.status(healthy ? 200 : 503).json({
    ok: healthy,
    appVersion: pkg.version,
    storageRoot: STORAGE_ROOT,
    checks: {
      database: dbReady,
      photos: photosReady,
    },
    database: dbReady
      ? {
          path: dbPath,
          sizeBytes: dbStats.size,
          modifiedAt: dbStats.mtime.toISOString(),
        }
      : null,
  });
});

module.exports = router;
