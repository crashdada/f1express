export type NullableString = string | null | undefined;

export type DriverIdentityInput = {
  firstName?: NullableString;
  lastName?: NullableString;
  firstNameCn?: NullableString;
  lastNameCn?: NullableString;
  code?: NullableString;
};

export type TeamIdentityInput = {
  name?: NullableString;
  nameCn?: NullableString;
  fullName?: NullableString;
};

export type DriverRegistryRecord = {
  canonicalId: string;
  name: {
    en: { first: string; last: string };
    zh: { first: string; last: string };
  };
  display: { short: string };
  codes: string[];
  numbers: number[];
  aliases: string[];
  sourceKeys: string[];
  activeRanges: Array<{ from?: number; to?: number }>;
};

export type TeamRegistryRecord = {
  canonicalId: string;
  familyId: string;
  name: {
    en: string;
    zh: string;
  };
  display: { short: string };
  aliases: string[];
  sourceKeys: string[];
  activeRanges: Array<{ from?: number; to?: number }>;
};
