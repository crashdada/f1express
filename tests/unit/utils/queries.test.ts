import { describe, expect, it } from 'vitest';
import { buildDriversQuery } from '../../../src/utils/f1-data/queries';

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
