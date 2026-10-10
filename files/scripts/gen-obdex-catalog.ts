// Usage:  npm run gen:obdex [-- <path-or-url to generic.json>]
//
// Builds src/core/dtcGeneric.generated.ts from OBDex, an open database of the
// generic (SAE J2012) trouble codes: https://github.com/foerbsnavi/OBDex
// OBDex data is CC0-1.0 (public domain), so it can be bundled as-is.
//
// The generic catalog is a fallback: the hand-curated dtcCatalog.generated.ts
// is consulted first (see core/dtcLookup.ts). Only the English text is kept.

import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { toRecord, ObdexCode } from '../src/core/obdexRecord';

const DEFAULT_SOURCE = 'https://foerbsnavi.github.io/OBDex/generic.json';
const OUTPUT = resolve(__dirname, '..', 'src', 'core', 'dtcGeneric.generated.ts');

async function load(source: string): Promise<unknown> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(source, 'utf-8'));
}

async function main(): Promise<void> {
  const source = process.argv[2] ?? DEFAULT_SOURCE;
  const data = await load(source);
  if (!Array.isArray(data)) throw new Error(`${source}: expected a JSON array of codes`);

  const catalog: Record<string, NonNullable<ReturnType<typeof toRecord>>> = {};
  for (const c of data as ObdexCode[]) {
    const code = String(c.code ?? '').trim().toUpperCase();
    if (!/^[PCBU][0-9A-F]{4}$/.test(code)) continue;
    const rec = toRecord(c);
    if (rec) catalog[code] = rec;
  }
  const count = Object.keys(catalog).length;
  if (count === 0) throw new Error(`${source}: no usable codes`);

  // One entry per line keeps the file diffable without doubling its size
  const entries = Object.keys(catalog).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(catalog[k])},`);
  const body = `// AUTO-GENERATED — do not edit by hand. Regenerate via \`npm run gen:obdex\`.
// Source:    OBDex generic.json, https://github.com/foerbsnavi/OBDex
// License:   CC0-1.0 (public domain dedication)
// Generated: ${new Date().toISOString()}
// Codes:     ${count} generic SAE J2012 codes (no manufacturer-specific codes)

import type { DTCRecord } from './dtcCatalog.generated';

export const DTC_GENERIC: Record<string, DTCRecord> = {
${entries.join('\n')}
};
`;
  writeFileSync(OUTPUT, body, 'utf-8');
  console.log(`Wrote ${OUTPUT} (${count} codes).`);
}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
