import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('child_process', () => ({
  exec: vi.fn((command, options, callback) => {
    callback(null, 'Status: Image is up to date', '');
  }),
}));

const { default: app } = await import('../../../server.cjs');

describe('Server API', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_API_TOKEN;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN;
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('GET /api/health should report service readiness', async () => {
    const response = await request(app).get('/api/health');

    expect([200, 503]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: expect.any(Boolean),
        storageRoot: expect.any(String),
        checks: expect.objectContaining({
          database: expect.any(Boolean),
          photos: expect.any(Boolean),
        }),
      }),
    );
  });

  it('GET /api/check-update should require an admin token when configured', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';

    const response = await request(app).get('/api/check-update');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized admin request');
  });

  it('GET /api/check-update should return update status', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';

    const response = await request(app)
      .get('/api/check-update')
      .set('x-admin-token', 'secret-token');

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          hasUpdate: expect.any(Boolean),
          image: expect.any(String),
        }),
      );
    } else {
      expect(response.body).toEqual(
        expect.objectContaining({
          hasUpdate: false,
          error: expect.any(String),
        }),
      );
    }
  });
});
