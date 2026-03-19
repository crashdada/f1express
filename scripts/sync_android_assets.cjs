const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDbPath = path.join(rootDir, 'dist', 'f1.db');
const androidDbPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public', 'f1.db');

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

console.log(`Synced Android database asset: ${androidDbPath} (${androidStats.size} bytes)`);
