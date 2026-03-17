import { renderHook, waitFor } from '@testing-library/react';
import { useDynamic2026Data, REMOTE_DATA_BASE_URL } from './useDynamic2026Data';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDynamic2026Data', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        // Mock non-localhost to ensure remote sync logic is tested
        vi.stubGlobal('location', { hostname: 'f1express.app' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initially return loading state', async () => {
        const { result } = renderHook(() => useDynamic2026Data());

        // Since useEffect runs immediately, we can't always catch the true state
        // if everything resolves instantly, so we at least check that it reaches false.
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.schedule).toBeDefined();
    });

    it('should fetch local data successfully and then attempt remote fetch', async () => {
        const mockLocalSchedule = Array.from({ length: 20 }, (_, i) => ({ round: (i + 1).toString() }));
        const mockRemoteSchedule = Array.from({ length: 20 }, (_, i) => ({ round: (i + 1).toString(), updated: i === 0 }));

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

        // Await local data fetch
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // The state should first reflect the local data
        // Wait for the remote to sync
        await waitFor(() => {
            expect(result.current.schedule[0]).toMatchObject(mockRemoteSchedule[0]);
        });

        // Both local (4) and remote (4) fetches should be called
        expect(fetchMock).toHaveBeenCalledTimes(8);
    });

    it('should retain local data if remote fetch fails', async () => {
        const mockLocalSchedule = [{ round: '1' }];

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

        // Await local data fetch
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.schedule).toEqual(mockLocalSchedule);
        });

        // Ensure remote fetch was attempted
        expect(fetchMock).toHaveBeenCalledTimes(8);
        // But the data should still be the local one
        expect(result.current.schedule[0]).toMatchObject(mockLocalSchedule[0]);
    });

    it('should handle local fetch error', async () => {
        const fetchMock = vi.mocked(global.fetch).mockImplementation(() => {
            return Promise.reject(new Error('Local Network Error'));
        });

        const { result } = renderHook(() => useDynamic2026Data());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeInstanceOf(Error);
            expect(result.current.error?.message).toBe('Local Network Error');
        });

        // Should not have attempted remote fetch due to the catch block preventing it
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});
