import { createElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { F1Provider } from '../../../src/context/F1Context';
import { useF1Data } from '../../../src/hooks/useF1Data';

const dataMocks = vi.hoisted(() => ({
  loadF1Data: vi.fn(),
}));

vi.mock('../../../src/utils/f1Data', () => ({
  loadF1Data: dataMocks.loadF1Data,
}));

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(F1Provider, null, children);
}

describe('useF1Data', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should stop retrying after a load error', async () => {
    dataMocks.loadF1Data.mockRejectedValue(new Error('db broken'));

    const { result } = renderHook(() => useF1Data(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('db broken');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(dataMocks.loadF1Data).toHaveBeenCalledTimes(1);
  });
});
