const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredPaths = [
  'Dockerfile',
  'entrypoint.sh',
  'server.cjs',
  'server/app.cjs',
  'server/config.cjs',
  'server/routes/health.cjs',
  'server/routes/updates.cjs',
  'server/middleware/adminAuth.cjs',
  'package.json',
  'package-lock.json',
  'dist/index.html',
  'dist/assets',
  'f1_storage/f1.db',
  'f1_storage/photos',
  'f1_storage/drivers_2026.json',
  'f1_storage/teams_2026.json',
  'f1_storage/schedule_2026.json',
  'f1_storage/results_2026.json',
];

const missing = requiredPaths.filter((rel) => !fs.existsSync(path.join(root, rel)));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const requiredRuntimeDeps = ['express', 'express-rate-limit'];
const missingRuntimeDeps = requiredRuntimeDeps.filter(
  (name) => !(pkg.dependencies && pkg.dependencies[name])
);

const serverFilesToInspect = [
  'server.cjs',
  'server/app.cjs',
  'server/routes/health.cjs',
].filter((rel) => fs.existsSync(path.join(root, rel)));
const serverSource = serverFilesToInspect
  .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
  .join('\n');
const dockerfileSource = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const entrypointSource = fs.readFileSync(path.join(root, 'entrypoint.sh'), 'utf8');

const checks = {
  requiredPathsPresent: missing.length === 0,
  runtimeDepsPresent: missingRuntimeDeps.length === 0,
  healthEndpointPresent: serverSource.includes('/health'),
  dockerHealthcheckPresent: dockerfileSource.includes('HEALTHCHECK'),
  entrypointStartsServer: entrypointSource.includes('exec node server.cjs'),
  dockerCopiesServerModules: dockerfileSource.includes('COPY server ./server'),
};

const ok = Object.values(checks).every(Boolean);

console.log(
  JSON.stringify(
    {
      ok,
      checks,
      missing,
      missingRuntimeDeps,
    },
    null,
    2
  )
);

if (!ok) {
  process.exit(1);
}
