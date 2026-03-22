import { renderHook, waitFor } from '@testing-library/react';
import { useDynamic2026Data, REMOTE_DATA_BASE_URL } from '../../../src/hooks/useDynamic2026Data';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetSeason2026DataCache } from '../../../src/utils/f1-data/season2026';

describe('useDynamic2026Data', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetSeason2026DataCache();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('location', { hostname: 'f1express.app' });
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    resetSeason2026DataCache();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should initially return loading state', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    const { result } = renderHook(() => useDynamic2026Data());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.schedule).toBeDefined();
  });

  it('should fetch local data successfully and then attempt remote fetch', async () => {
    const mockLocalSchedule = Array.from({ length: 20 }, (_, index) => ({ round: (index + 1).toString() }));
    const mockRemoteSchedule = Array.from({ length: 20 }, (_, index) => ({ round: (index + 1).toString(), updated: index === 0 }));

    const fetchMock = vi.mocked(global.fetch).mockImplementation((input: any) => {
      if (input.includes(REMOTE_DATA_BASE_URL)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRemoteSchedule),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLocalSchedule),
      } as any);
    });

    const { result } = renderHook(() => useDynamic2026Data());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.schedule[0]).toMatchObject(mockRemoteSchedule[0]);
    });

    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('should retain local data if remote fetch fails', async () => {
    const mockLocalSchedule = Array.from({ length: 20 }, (_, index) => ({ round: String(index + 1) }));

    const fetchMock = vi.mocked(global.fetch).mockImplementation((input: any) => {
      if (input.includes(REMOTE_DATA_BASE_URL)) {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLocalSchedule),
      } as any);
    });

    const { result } = renderHook(() => useDynamic2026Data());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.schedule).toEqual(mockLocalSchedule);
    });

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(result.current.schedule[0]).toMatchObject(mockLocalSchedule[0]);
  });

  it('should skip remote sync on localhost', async () => {
    const mockSchedule = Array.from({ length: 20 }, (_, index) => ({ round: String(index + 1) }));
    vi.stubGlobal('location', { hostname: 'localhost' });

    const fetchMock = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    } as any);

    const { result } = renderHook(() => useDynamic2026Data());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('should handle local fetch error', async () => {
    const fetchMock = vi.mocked(global.fetch).mockImplementation(() => Promise.reject(new Error('Local Network Error')));

    const { result } = renderHook(() => useDynamic2026Data());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load 2026 runtime data');
    });

    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
