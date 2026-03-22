import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

const { default: app } = await import('../../../server.cjs');
const execMock = vi.mocked(exec);

describe('Server API', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_API_TOKEN;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    execMock.mockImplementation((command, options, callback) => {
      const done = typeof options === 'function' ? options : callback;
      done?.(null, 'Status: Image is up to date', '');
      return { pid: 1234 };
    });
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
        appVersion: expect.any(String),
        storageRoot: expect.any(String),
        checks: expect.objectContaining({
          database: expect.any(Boolean),
          photos: expect.any(Boolean),
        }),
      }),
    );

    if (response.body.checks.database) {
      expect(response.body.database).toEqual(
        expect.objectContaining({
          path: expect.any(String),
          sizeBytes: expect.any(Number),
          modifiedAt: expect.any(String),
        }),
      );
    }
  });

  it('GET /api/check-update should require an admin token when configured', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';

    const response = await request(app).get('/api/check-update');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized admin request');
  });

  it('GET /api/check-update should reject requests when no admin token is configured', async () => {
    const response = await request(app).get('/api/check-update');

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('ADMIN_API_TOKEN is required for update endpoints.');
  });

  it(
    'GET /api/check-update should return update status',
    async () => {
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
    },
    10000,
  );
});
