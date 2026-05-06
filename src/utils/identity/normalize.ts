import type { NullableString } from './types';

export function normalizeIdentityText(value?: NullableString) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.·'()]/g, '')
    .trim();
}
