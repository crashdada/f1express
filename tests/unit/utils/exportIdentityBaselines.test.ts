import { describe, expect, it } from 'vitest';
import { buildBaselinePayloads } from '../../../scripts/export_identity_baselines.cjs';

describe('identity baseline exporter', () => {
  it('builds driver and team snapshots with totals breakdowns', () => {
    const baselines = buildBaselinePayloads();

    expect(baselines.driverTotals.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(baselines.teamTotals.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(baselines.driverTotals.entries.length).toBeGreaterThan(0);
    expect(baselines.teamTotals.entries.length).toBeGreaterThan(0);

    const firstTeam = baselines.teamTotals.entries[0];
    expect(firstTeam).toHaveProperty('historicalPoints');
    expect(firstTeam).toHaveProperty('live2026Points');
    expect(firstTeam).toHaveProperty('totalPoints');
  });
});
