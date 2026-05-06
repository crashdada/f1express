import { describe, expect, it } from 'vitest';
import {
  getDriverDisplayName,
  getDriverMatchKeys,
  getTeamDisplayName,
  getTeamFamilyId,
  getTeamMatchKeys,
  resolveDriverIdentity,
  resolveTeamIdentity,
} from '../../../src/utils/identity/resolver';

describe('identity resolver', () => {
  it('resolves active driver aliases and exposes canonical display fields', () => {
    const driver = resolveDriverIdentity({
      firstName: 'Andrea Kimi',
      lastName: 'Antonelli',
      code: 'ANT',
    });

    expect(driver?.canonicalId).toBe('kimi-antonelli');
    expect(getDriverDisplayName(driver, 'zh-CN')).toBe('安东内利');
    expect(getDriverMatchKeys(driver)).toContain('kimiantonelli');
  });

  it('resolves team aliases to canonical team and family ids', () => {
    const team = resolveTeamIdentity({ name: 'Racing Bulls' });

    expect(team?.canonicalId).toBe('racing-bulls');
    expect(getTeamFamilyId(team)).toBe('rb-family');
    expect(getTeamDisplayName(team, 'zh-CN')).toBe('小红牛');
    expect(getTeamMatchKeys(team)).toContain('rb');
  });
});
