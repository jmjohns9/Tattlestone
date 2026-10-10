import type { DTCCode, NhtsaBulletin } from '../../shared/types';

/** Codes the vehicle has reported this session, de-duplicated and sorted. */
export function reportedCodes(dtcs: ReadonlyArray<Pick<DTCCode, 'code'>>): string[] {
  return [...new Set(dtcs.map(d => d.code.toUpperCase()))].sort();
}

export function mentionsAny(b: Pick<NhtsaBulletin, 'codes'>, codes: ReadonlyArray<string>): boolean {
  return b.codes.some(c => codes.includes(c));
}

/** Bulletins whose number, summary, component or codes contain every search word. */
export function filterBulletins(
  list: ReadonlyArray<NhtsaBulletin>, query: string, onlyCodes: ReadonlyArray<string> | null,
): NhtsaBulletin[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(b => {
    if (onlyCodes && !mentionsAny(b, onlyCodes)) return false;
    if (!words.length) return true;
    const hay = [b.number, b.summary, ...b.components, ...b.codes].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
