// Maps one OBDex entry (https://github.com/foerbsnavi/OBDex) to a DTCRecord.
// Used by scripts/gen-obdex-catalog.ts; kept here so it is unit-tested.

import type { DTCRecord } from './dtcCatalog.generated';

export interface Localized { en?: string }
export interface ObdexCode {
  code: string;
  title?: Localized;
  description?: Localized;
  common_causes?: Array<{ likelihood?: string; label?: Localized }>;
  symptoms?: Localized[];
  repair?: { difficulty?: string; diy_possible?: boolean; estimated_hours?: [number, number] };
}

const LIKELIHOOD_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function toRecord(c: ObdexCode): DTCRecord | null {
  const description = (c.title?.en ?? c.description?.en ?? '').trim();
  if (!description) return null;

  const causes = [...(c.common_causes ?? [])]
    .sort((a, b) => (LIKELIHOOD_ORDER[a.likelihood ?? ''] ?? 3) - (LIKELIHOOD_ORDER[b.likelihood ?? ''] ?? 3))
    .map(x => x.label?.en?.trim())
    .filter((s): s is string => !!s);

  // OBDex has no repair procedure, only effort estimates and symptoms
  const parts: string[] = [];
  const r = c.repair;
  if (r?.difficulty) {
    const hours = r.estimated_hours ? `, about ${r.estimated_hours[0]}–${r.estimated_hours[1]} h` : '';
    const who = r.diy_possible === true ? ', often DIY' : r.diy_possible === false ? ', usually a shop job' : '';
    parts.push(`Typical repair: ${r.difficulty} difficulty${hours}${who}.`);
  }
  const symptoms = (c.symptoms ?? []).map(s => s.en?.trim()).filter(Boolean);
  if (symptoms.length) parts.push(`Symptoms: ${symptoms.join('; ')}.`);
  parts.push('Confirm with the factory service manual before replacing parts.');

  return { description, ...(causes.length ? { causes } : {}), repair: parts.join(' ') };
}
