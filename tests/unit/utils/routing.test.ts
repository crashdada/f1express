import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeInitialHashRoute } from '../../../src/utils/routing';

describe('normalizeInitialHashRoute', () => {
  const replace = vi.fn();

  afterEach(() => {
    replace.mockReset();
    vi.unstubAllGlobals();
  });

  it('rewrites direct paths into hash routes', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://f1.example.com',
        pathname: '/new-season',
        search: '?tab=drivers',
        hash: '',
        replace,
      },
    });

    normalizeInitialHashRoute();

    expect(replace).toHaveBeenCalledWith('https://f1.example.com/#/new-season?tab=drivers');
  });

  it('leaves existing hash routes untouched', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://f1.example.com',
        pathname: '/',
        search: '',
        hash: '#/settings',
        replace,
      },
    });

    normalizeInitialHashRoute();

    expect(replace).not.toHaveBeenCalled();
  });
});
