import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataManagementPage from '../../../src/pages/DataManagementPage';
import { renderWithRouter } from '../../support/render';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('../../../src/components/AppUpdater', () => ({
  checkForUpdates: vi.fn(),
  getApkDownloadUrl: vi.fn(),
}));

function createJsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('DataManagementPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('location', {
      ...window.location,
      hostname: 'f1.example.com',
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the stored admin token and sends it when checking for updates', async () => {
    localStorage.setItem('f1express-admin-token', '  secret-token  ');
    vi.mocked(global.fetch).mockResolvedValue(
      createJsonResponse({
        hasUpdate: false,
        message: 'Already current.',
      }),
    );

    renderWithRouter(<DataManagementPage />);

    const tokenInput = screen.getByPlaceholderText('Required only when the server sets ADMIN_API_TOKEN');
    expect(tokenInput).toHaveValue('  secret-token  ');

    await userEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/check-update', {
        headers: { 'x-admin-token': 'secret-token' },
      });
    });

    expect(await screen.findByText('Already current.')).toBeInTheDocument();
  });

  it('persists admin token edits to localStorage', async () => {
    vi.mocked(global.fetch).mockResolvedValue(createJsonResponse({ hasUpdate: false }));

    renderWithRouter(<DataManagementPage />);

    const tokenInput = screen.getByPlaceholderText('Required only when the server sets ADMIN_API_TOKEN');
    await userEvent.type(tokenInput, 'new-token');

    expect(localStorage.getItem('f1express-admin-token')).toBe('new-token');
  });

  it('shows the update action after a newer image is found and handles self-update failures', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        createJsonResponse({
          hasUpdate: true,
          message: 'A newer Docker image is available.',
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          error: 'Socket missing.',
        }, false),
      );

    renderWithRouter(<DataManagementPage />);

    await userEvent.click(screen.getAllByRole('button')[0]);

    expect(await screen.findByText('A newer Docker image is available.')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith('/api/self-update', {
        method: 'POST',
        headers: {},
      });
    });

    expect((await screen.findAllByText('Socket missing.')).length).toBeGreaterThan(0);
  });

  it('does not trigger self-update when the user cancels confirmation', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createJsonResponse({
        hasUpdate: true,
        message: 'A newer Docker image is available.',
      }),
    );
    vi.mocked(global.confirm).mockReturnValue(false);

    renderWithRouter(<DataManagementPage />);

    await userEvent.click(screen.getAllByRole('button')[0]);
    expect(await screen.findByText('A newer Docker image is available.')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[1]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
