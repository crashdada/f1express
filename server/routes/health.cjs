const express = require('express');
const fs = require('fs');
const path = require('path');
const { PHOTOS_ROOT, STORAGE_ROOT } = require('../config.cjs');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbPath = path.join(STORAGE_ROOT, 'f1.db');
  const dbReady = fs.existsSync(dbPath);
  const photosReady = fs.existsSync(PHOTOS_ROOT);
  const healthy = dbReady && photosReady;

  return res.status(healthy ? 200 : 503).json({
    ok: healthy,
    storageRoot: STORAGE_ROOT,
    checks: {
      database: dbReady,
      photos: photosReady,
    },
  });
});

module.exports = router;
