import { describe, expect, it } from 'vitest';
import { buildDriversQuery } from '../../../src/utils/f1-data/queries';
import { shouldRefreshCachedDb } from '../../../src/utils/f1-data/cache';

describe('driver query compatibility', () => {
  it('falls back to NULL for optional legacy-missing driver columns', () => {
    const sql = buildDriversQuery(
      new Set([
        'driver_id',
        'code',
        'first_name',
        'last_name',
        'first_name_cn',
        'last_name_cn',
        'nationality',
      ])
    );

    expect(sql).toContain('NULL as birth_date');
    expect(sql).toContain('NULL as birth_place');
    expect(sql).toContain('NULL as age');
    expect(sql).toContain('0 as number');
  });
});

describe('database cache freshness', () => {
  it('refreshes the cached db when remote metadata changes', () => {
    expect(
      shouldRefreshCachedDb(
        {
          sizeBytes: 2248704,
          modifiedAt: '2026-03-08T07:14:52.000Z',
          appVersion: '1.2.0',
        },
        {
          sizeBytes: 2248704,
          modifiedAt: '2026-03-18T03:25:21.000Z',
          appVersion: '1.2.0',
        }
      )
    ).toBe(true);
  });
});
