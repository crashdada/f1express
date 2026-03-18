const express = require('express');
const path = require('path');
const { DIST_ROOT, PHOTOS_ROOT, STORAGE_ROOT } = require('./config.cjs');
const healthRoutes = require('./routes/health.cjs');
const updateRoutes = require('./routes/updates.cjs');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/data', express.static(STORAGE_ROOT));
  app.use('/photos', express.static(PHOTOS_ROOT));
  app.use(express.static(DIST_ROOT));

  app.use('/api', healthRoutes);
  app.use('/api', updateRoutes);

  app.use((req, res) => {
    const isResource =
      req.path.includes('.') ||
      req.path.startsWith('/data/') ||
      req.path.startsWith('/photos/');

    if (isResource) {
      return res.status(404).send('Resource Not Found');
    }

    return res.sendFile(path.join(DIST_ROOT, 'index.html'));
  });

  return app;
}

module.exports = {
  createApp,
};
