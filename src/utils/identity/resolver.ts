import { driverRegistry, teamRegistry } from './registry';
import { normalizeIdentityText } from './normalize';
import type {
  DriverIdentityInput,
  DriverRegistryRecord,
  NullableString,
  TeamIdentityInput,
  TeamRegistryRecord,
} from './types';

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function buildDriverRecordKeys(record: DriverRegistryRecord) {
  return unique([
    normalizeIdentityText(`${record.name.en.first} ${record.name.en.last}`),
    normalizeIdentityText(`${record.name.zh.first}${record.name.zh.last}`),
    ...record.aliases.map((alias) => normalizeIdentityText(alias)),
    ...record.codes.map((code) => `code:${normalizeIdentityText(code)}`),
  ]);
}

function buildTeamRecordKeys(record: TeamRegistryRecord) {
  const rawKeys = [
    record.name.en,
    record.name.zh,
    record.display.short,
    ...record.aliases,
    ...record.sourceKeys,
  ];

  const normalized = rawKeys.flatMap((value) => {
    const base = normalizeIdentityText(value);
    const withoutCommonSuffix = normalizeIdentityText(
      value
        .replace(/\bF1 Team\b/gi, '')
        .replace(/\bTeam\b/gi, '')
        .replace(/\bAMG\b/gi, '')
        .trim()
    );
    return unique([base, withoutCommonSuffix]);
  });

  if (record.canonicalId === 'racing-bulls') {
    normalized.push('rb');
  }

  return unique(normalized);
}

const driverKeyIndex = new Map<string, DriverRegistryRecord>();
const teamKeyIndex = new Map<string, TeamRegistryRecord>();

driverRegistry.forEach((record) => {
  buildDriverRecordKeys(record).forEach((key) => driverKeyIndex.set(key, record));
});

teamRegistry.forEach((record) => {
  buildTeamRecordKeys(record).forEach((key) => teamKeyIndex.set(key, record));
});

function getDriverInputKeys(input?: DriverIdentityInput | DriverRegistryRecord) {
  if (!input) {
    return [];
  }

  if ('canonicalId' in input) {
    return buildDriverRecordKeys(input);
  }

  const englishName = [input.firstName, input.lastName].filter(Boolean).join(' ');
  const chineseName = [input.firstNameCn, input.lastNameCn].filter(Boolean).join('');
  const codeKey = normalizeIdentityText(input.code);

  return unique([
    normalizeIdentityText(englishName),
    normalizeIdentityText(chineseName),
    codeKey ? `code:${codeKey}` : '',
  ]);
}

function getTeamInputKeys(input?: TeamIdentityInput | TeamRegistryRecord) {
  if (!input) {
    return [];
  }

  if ('canonicalId' in input) {
    return buildTeamRecordKeys(input);
  }

  const rawValues = [input.name, input.nameCn, input.fullName].filter(Boolean) as string[];
  return unique(
    rawValues.flatMap((value) => {
      const base = normalizeIdentityText(value);
      const withoutCommonSuffix = normalizeIdentityText(
        value
          .replace(/\bF1 Team\b/gi, '')
          .replace(/\bTeam\b/gi, '')
          .replace(/\bAMG\b/gi, '')
          .trim()
      );
      return [base, withoutCommonSuffix];
    })
  );
}

export function resolveDriverIdentity(input?: DriverIdentityInput | DriverRegistryRecord) {
  return getDriverInputKeys(input).map((key) => driverKeyIndex.get(key)).find(Boolean) || null;
}

export function resolveTeamIdentity(input?: TeamIdentityInput | TeamRegistryRecord) {
  return getTeamInputKeys(input).map((key) => teamKeyIndex.get(key)).find(Boolean) || null;
}

export function getDriverMatchKeys(input?: DriverIdentityInput | DriverRegistryRecord) {
  const resolved = resolveDriverIdentity(input);
  if (resolved) {
    return buildDriverRecordKeys(resolved);
  }
  return getDriverInputKeys(input);
}

export function getTeamMatchKeys(
  ...values: Array<NullableString | TeamIdentityInput | TeamRegistryRecord>
) {
  const firstValue = values[0];
  if (firstValue && typeof firstValue === 'object') {
    return getResolvedTeamMatchKeys(firstValue as TeamIdentityInput | TeamRegistryRecord);
  }

  return getTeamInputKeys({
    name: values[0] as NullableString,
    nameCn: values[1] as NullableString,
    fullName: values[2] as NullableString,
  });
}

export function getResolvedTeamMatchKeys(input?: TeamIdentityInput | TeamRegistryRecord) {
  const resolved = resolveTeamIdentity(input);
  if (resolved) {
    return buildTeamRecordKeys(resolved);
  }
  return getTeamInputKeys(input);
}

export function matchesDriver(
  left?: DriverIdentityInput | DriverRegistryRecord,
  right?: DriverIdentityInput | DriverRegistryRecord
) {
  const rightKeys = new Set(getDriverMatchKeys(right));
  return getDriverMatchKeys(left).some((key) => rightKeys.has(key));
}

export function matchesTeam(
  left?: TeamIdentityInput | TeamRegistryRecord,
  right?: TeamIdentityInput | TeamRegistryRecord
) {
  const rightKeys = new Set(getResolvedTeamMatchKeys(right));
  return getResolvedTeamMatchKeys(left).some((key) => rightKeys.has(key));
}

export function getDriverDisplayName(
  driver?: DriverRegistryRecord | null,
  locale: 'zh-CN' | 'en' = 'zh-CN'
) {
  if (!driver) {
    return '';
  }

  if (locale === 'zh-CN') {
    return driver.display.short || `${driver.name.zh.first}${driver.name.zh.last}`;
  }

  return `${driver.name.en.first} ${driver.name.en.last}`.trim();
}

export function getTeamDisplayName(
  team?: TeamRegistryRecord | null,
  locale: 'zh-CN' | 'en' = 'zh-CN'
) {
  if (!team) {
    return '';
  }

  if (locale === 'zh-CN' && team.name.zh) {
    return team.name.zh;
  }

  return team.display.short || team.name.en;
}

export function getTeamFamilyId(team?: TeamRegistryRecord | null) {
  return team?.familyId || '';
}
