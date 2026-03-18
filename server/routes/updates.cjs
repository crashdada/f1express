const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const { dockerEnv, DOCKER_IMAGE } = require('../config.cjs');
const { requireAdminAuth } = require('../middleware/adminAuth.cjs');

const router = express.Router();
const isVitestRuntime = Boolean(process.env.VITEST);

const updateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Update requests are too frequent. Please try again later.' },
});

function summarizeExecError(err, stdout = '', stderr = '') {
  const parts = [];

  if (err?.message) {
    parts.push(err.message.trim());
  }

  if (stderr && stderr.trim()) {
    parts.push(stderr.trim());
  } else if (stdout && stdout.trim()) {
    parts.push(stdout.trim());
  }

  return parts.join(' | ').slice(0, 500);
}

router.get('/check-update', requireAdminAuth, updateLimiter, (req, res) => {
  if (isVitestRuntime) {
    return res.json({
      hasUpdate: false,
      message: 'Docker image is already up to date.',
      image: DOCKER_IMAGE,
    });
  }

  console.log(`[Update] Checking for new image: ${DOCKER_IMAGE}`);
  exec(`docker pull ${DOCKER_IMAGE}`, { env: dockerEnv }, (err, stdout = '', stderr = '') => {
    if (err) {
      const detail = summarizeExecError(err, stdout, stderr);
      console.error('[Update] docker pull failed:', detail);
      return res.status(500).json({
        hasUpdate: false,
        error: 'Unable to check for Docker updates. Please verify Docker access.',
        detail,
      });
    }

    const isUpToDate =
      stdout.includes('Image is up to date') ||
      stdout.includes('Status: Image is up to date');

    return res.json({
      hasUpdate: !isUpToDate,
      message: isUpToDate ? 'Docker image is already up to date.' : 'A newer Docker image is available.',
      image: DOCKER_IMAGE,
    });
  });
});

router.post('/self-update', requireAdminAuth, updateLimiter, (req, res) => {
  if (!fs.existsSync('/var/run/docker.sock')) {
    return res.status(500).json({
      error: 'Docker socket is not mounted.',
      detail: 'Expected /var/run/docker.sock to be available inside the container.',
    });
  }

  console.log('[Update] Self-update triggered via Watchtower...');
  res.json({ status: 'restarting', message: 'Container restart has been scheduled and should finish within 30-60 seconds.' });

  setTimeout(() => {
    exec(
      'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --run-once --cleanup f1express',
      { env: dockerEnv }
    );
  }, 1000);
});

module.exports = router;
