const path = require('path');

const STORAGE_ROOT = process.env.F1_STORAGE_ROOT || path.join(__dirname, '..', 'storage');
const DIST_ROOT = path.join(__dirname, '..', 'dist');
const PHOTOS_ROOT = path.join(STORAGE_ROOT, 'photos');
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'dudumin/f1express:latest';
const DOCKER_API_VERSION = process.env.DOCKER_API_VERSION || '1.43';
const dockerEnv = { ...process.env, DOCKER_API_VERSION };

module.exports = {
  STORAGE_ROOT,
  DIST_ROOT,
  PHOTOS_ROOT,
  DOCKER_IMAGE,
  DOCKER_API_VERSION,
  dockerEnv,
};
