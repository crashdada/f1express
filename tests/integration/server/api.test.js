import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

const { default: app } = await import('../../../server.cjs');
const execMock = vi.mocked(exec);

describe('Server API', () => {
  let consoleErrorSpy;
  let consoleLogSpy;
  let existsSyncSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    delete process.env.ADMIN_API_TOKEN;
    delete process.env.F1EXPRESS_RUNTIME_DATA_BASE_URL;
    delete process.env.F1EXPRESS_GITHUB_TOKEN;
    vi.stubGlobal('fetch', vi.fn());
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((targetPath) => targetPath !== '/var/run/docker.sock');
    execMock.mockImplementation((command, options, callback) => {
      const done = typeof options === 'function' ? options : callback;
      done?.(null, 'Status: Image is up to date', '');
      return { pid: 1234 };
    });
  });

  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN;
    delete process.env.F1EXPRESS_RUNTIME_DATA_BASE_URL;
    delete process.env.F1EXPRESS_GITHUB_TOKEN;
    vi.unstubAllGlobals();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    existsSyncSpy.mockRestore();
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

  it('GET /data/results_2026.json should refresh runtime data from remote storage before serving', async () => {
    process.env.F1EXPRESS_RUNTIME_DATA_BASE_URL = 'https://example.test/f1express/main/storage';
    process.env.F1EXPRESS_GITHUB_TOKEN = 'github-token';
    const remoteResults = [{ slug: 'canada', results: [{ code: 'ANT', points: 25 }] }];
    const writeFileSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {});
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteResults),
    });

    try {
      const response = await request(app).get('/data/results_2026.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(remoteResults);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.test/f1express/main/storage/results_2026.json',
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.objectContaining({
            Authorization: 'Bearer github-token',
          }),
        }),
      );
      expect(writeFileSpy).toHaveBeenCalled();
      expect(renameSpy).toHaveBeenCalled();
    } finally {
      writeFileSpy.mockRestore();
      renameSpy.mockRestore();
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

  it('POST /api/self-update should require an admin token when configured', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';

    const response = await request(app).post('/api/self-update');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized admin request');
  });

  it('POST /api/self-update should fail when the Docker socket is missing', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    existsSyncSpy.mockReturnValue(false);

    const response = await request(app)
      .post('/api/self-update')
      .set('x-admin-token', 'secret-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: 'Docker socket is not mounted.',
      }),
    );
  });

  it('POST /api/self-update should schedule a delayed watchtower run when the Docker socket is present', async () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    existsSyncSpy.mockReturnValue(true);

    const response = await request(app)
      .post('/api/self-update')
      .set('x-admin-token', 'secret-token');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('restarting');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
