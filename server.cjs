const fs = require('fs');
const path = require('path');
const { createApp } = require('./server/app.cjs');
const { PHOTOS_ROOT, STORAGE_ROOT } = require('./server/config.cjs');
const { requireAdminAuth } = require('./server/middleware/adminAuth.cjs');

const app = createApp();
const PORT = process.env.PORT || 8001;

function logStartup() {
  console.log('=================================================');
  console.log('F1 Express Server (Standard storage Mode)');
  console.log(`Port: ${PORT}`);
  console.log(`Storage: ${STORAGE_ROOT}`);

  const dbPath = path.join(STORAGE_ROOT, 'f1.db');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`Database found: ${dbPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error(`Database NOT found: ${dbPath}`);
  }

  if (fs.existsSync(PHOTOS_ROOT)) {
    console.log(`Photos directory found: ${PHOTOS_ROOT}`);
  } else {
    console.error(`Photos directory NOT found: ${PHOTOS_ROOT}`);
  }

  console.log('=================================================');
}

function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logStartup();
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
module.exports.requireAdminAuth = requireAdminAuth;
