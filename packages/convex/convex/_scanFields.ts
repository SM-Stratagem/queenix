/**
 * Queenix Gym — pure helpers for OCR scan results (services/ocr).
 * Shared by Convex (plate matching), web and mobile (review-form prefill).
 * No Convex imports: safe to bundle anywhere.
 */

export type ScanKind = 'emirates_id' | 'passport' | 'plate' | 'receipt' | 'document';

export type OcrResult = {
  kind: ScanKind;
  fields: Record<string, any>;
  lines: Array<{ text: string; confidence: number }>;
  confidence: number;
  warnings: string[];
};

/** 'dxb a 12345' / 'DXB-A-12345' → 'DXBA12345'. */
export const normalizePlate = (plate: string): string => plate.replace(/[^a-z0-9]/gi, '').toUpperCase();

/**
 * Same plate, ignoring spacing/case and an emirate prefix on either side
 * ('DXB A 12345' matches a saved 'A12345').
 * ponytail: suffix match, ≥4 chars; add per-emirate codes if two emirates share a code+number.
 */
export function platesMatch(a: string, b: string): boolean {
  const na = normalizePlate(a);
  const nb = normalizePlate(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return (nb.length >= 4 && na.endsWith(nb)) || (na.length >= 4 && nb.endsWith(na));
}

export type IdentityDraft = {
  docType: 'emirates_id' | 'passport';
  docNumber: string;
  fullName: string;
  nationality: string;
  dateOfBirth: string;
  expiryDate: string;
  sex: string;
};

/** OCR fields → editable identity form values (empty string when not read). */
export function identityFromOcr(r: Pick<OcrResult, 'kind' | 'fields'>): IdentityDraft {
  const f = r.fields ?? {};
  const s = (x: unknown) => (typeof x === 'string' ? x : '');
  const passport = r.kind === 'passport';
  return {
    docType: passport ? 'passport' : 'emirates_id',
    docNumber: s(passport ? f.passport_number : f.id_number),
    fullName: passport ? [s(f.given_names), s(f.surname)].filter(Boolean).join(' ') : s(f.name),
    nationality: s(f.nationality),
    dateOfBirth: s(f.date_of_birth),
    expiryDate: s(f.expiry_date),
    sex: s(f.sex),
  };
}
