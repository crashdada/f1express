function getAdminApiToken() {
  return (process.env.ADMIN_API_TOKEN || '').trim();
}

function getRequestAdminToken(req) {
  const headerToken = req.get('x-admin-token');
  if (headerToken) {
    return headerToken.trim();
  }

  const authHeader = req.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

function requireAdminAuth(req, res, next) {
  const configuredToken = getAdminApiToken();
  if (!configuredToken) {
    return next();
  }

  const requestToken = getRequestAdminToken(req);
  if (requestToken && requestToken === configuredToken) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized admin request',
  });
}

module.exports = {
  getAdminApiToken,
  getRequestAdminToken,
  requireAdminAuth,
};
