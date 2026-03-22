type NullableString = string | null | undefined;

type DriverIdentity = {
  firstName?: NullableString;
  lastName?: NullableString;
  firstNameCn?: NullableString;
  lastNameCn?: NullableString;
  code?: NullableString;
};

type TeamIdentity = {
  name?: NullableString;
  nameCn?: NullableString;
  fullName?: NullableString;
};

const TEAM_ALIAS_KEYS: Record<string, string[]> = {
  mercedesamg: ['mercedes'],
  mercedesamgpetronasf1team: ['mercedes'],
  audif1team: ['audi'],
  cadillacf1team: ['cadillac'],
};

const DRIVER_ALIAS_KEYS: Record<string, string[]> = {
  kimiantonelli: ['andreakimiantonelli'],
  andreakimiantonelli: ['kimiantonelli'],
  oliverbearman: ['olliebearman'],
  olliebearman: ['oliverbearman'],
};

export function normalizeEntityText(value?: NullableString) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.路'()]/g, '')
    .trim();
}

export function getTeamMatchKeys(...values: NullableString[]) {
  const keys = new Set<string>();

  values.forEach((value) => {
    const raw = value || '';
    const normalized = normalizeEntityText(raw);
    if (normalized) {
      keys.add(normalized);
    }

    const withoutCommonSuffix = raw
      .replace(/\bF1 Team\b/gi, '')
      .replace(/\bTeam\b/gi, '')
      .replace(/\bAMG\b/gi, '')
      .trim();
    const normalizedWithoutSuffix = normalizeEntityText(withoutCommonSuffix);
    if (normalizedWithoutSuffix) {
      keys.add(normalizedWithoutSuffix);
    }

    [normalized, normalizedWithoutSuffix].forEach((key) => {
      if (!key) return;
      (TEAM_ALIAS_KEYS[key] || []).forEach((alias) => keys.add(alias));
    });
  });

  return [...keys];
}

export function getDriverMatchKeys(driver?: DriverIdentity) {
  if (!driver) {
    return [];
  }

  const keys = new Set<string>();
  const englishKey = normalizeEntityText([driver.firstName, driver.lastName].filter(Boolean).join(' '));
  const chineseKey = normalizeEntityText([driver.firstNameCn, driver.lastNameCn].filter(Boolean).join(''));
  const codeKey = normalizeEntityText(driver.code);

  if (englishKey) {
    keys.add(englishKey);
    (DRIVER_ALIAS_KEYS[englishKey] || []).forEach((alias) => keys.add(alias));
  }

  if (chineseKey) {
    keys.add(chineseKey);
    (DRIVER_ALIAS_KEYS[chineseKey] || []).forEach((alias) => keys.add(alias));
  }

  if (keys.size === 0 && codeKey) {
    keys.add(`code:${codeKey}`);
  }

  return [...keys];
}

export function matchesDriver(left?: DriverIdentity, right?: DriverIdentity) {
  const rightKeys = new Set(getDriverMatchKeys(right));
  return getDriverMatchKeys(left).some((key) => rightKeys.has(key));
}

export function matchesTeam(left?: TeamIdentity, right?: TeamIdentity) {
  const rightKeys = new Set(getTeamMatchKeys(right?.name, right?.nameCn, right?.fullName));
  return getTeamMatchKeys(left?.name, left?.nameCn, left?.fullName).some((key) => rightKeys.has(key));
}
