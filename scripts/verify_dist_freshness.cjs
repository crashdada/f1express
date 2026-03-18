const { execSync } = require('child_process');

try {
  const output = execSync('git status --porcelain -- dist', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  if (output) {
    console.error('dist/ is out of date. Rebuild and commit the generated artifacts before release.');
    console.error(output);
    process.exit(1);
  }

  console.log('dist/ is in sync with the current source tree.');
} catch (error) {
  const stdout = String(error.stdout || '').trim();
  const stderr = String(error.stderr || '').trim();

  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }

  process.exit(error.status || 1);
}
