const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDbPath = path.join(rootDir, 'dist', 'f1.db');
const androidDbPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public', 'f1.db');
const distDataDir = path.join(rootDir, 'dist', 'data');
const storageDataDir = path.join(rootDir, 'storage');
const androidDataDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public', 'data');
const storagePhotosDir = path.join(rootDir, 'storage', 'photos');
const androidPhotosDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public', 'photos');
const runtimeJsonFiles = [
  'schedule_2026.json',
  'results_2026.json',
  'drivers_2026.json',
  'teams_2026.json',
];

if (!fs.existsSync(distDbPath)) {
  throw new Error(`Missing bundled database: ${distDbPath}`);
}

const distStats = fs.statSync(distDbPath);
if (distStats.size === 0) {
  throw new Error(`Bundled database is empty: ${distDbPath}`);
}

fs.mkdirSync(path.dirname(androidDbPath), { recursive: true });
fs.copyFileSync(distDbPath, androidDbPath);

const androidStats = fs.statSync(androidDbPath);
if (androidStats.size !== distStats.size) {
  throw new Error(
    `Android database size mismatch: expected ${distStats.size}, got ${androidStats.size}`
  );
}

const sourceDataDir = fs.existsSync(distDataDir) ? distDataDir : storageDataDir;

fs.mkdirSync(androidDataDir, { recursive: true });
for (const filename of runtimeJsonFiles) {
  const distJsonPath = path.join(sourceDataDir, filename);
  const androidJsonPath = path.join(androidDataDir, filename);

  if (!fs.existsSync(distJsonPath)) {
    throw new Error(`Missing bundled runtime dataset: ${distJsonPath}`);
  }

  const distJsonStats = fs.statSync(distJsonPath);
  if (distJsonStats.size === 0) {
    throw new Error(`Bundled runtime dataset is empty: ${distJsonPath}`);
  }

  fs.copyFileSync(distJsonPath, androidJsonPath);
  const androidJsonStats = fs.statSync(androidJsonPath);
  if (androidJsonStats.size !== distJsonStats.size) {
    throw new Error(
      `Android runtime dataset size mismatch for ${filename}: expected ${distJsonStats.size}, got ${androidJsonStats.size}`
    );
  }
}

if (!fs.existsSync(storagePhotosDir)) {
  throw new Error(`Missing photos directory: ${storagePhotosDir}`);
}

fs.cpSync(storagePhotosDir, androidPhotosDir, { recursive: true, force: true });

const androidPhotosIndexPath = path.join(androidPhotosDir, 'index.json');
if (!fs.existsSync(androidPhotosIndexPath)) {
  throw new Error(`Missing Android photos index after sync: ${androidPhotosIndexPath}`);
}

const androidPhotosIndexStats = fs.statSync(androidPhotosIndexPath);
if (androidPhotosIndexStats.size === 0) {
  throw new Error(`Android photos index is empty: ${androidPhotosIndexPath}`);
}

console.log(`Synced Android database asset: ${androidDbPath} (${androidStats.size} bytes)`);
console.log(`Synced Android 2026 datasets from ${sourceDataDir} into: ${androidDataDir}`);
console.log(`Synced Android photos into: ${androidPhotosDir}`);
