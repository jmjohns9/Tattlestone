import { DTC_CATALOG, DTCRecord } from './dtcCatalog.generated';
import { DTC_GENERIC } from './dtcGeneric.generated';

// The hand-curated catalog wins; OBDex (generic SAE J2012 codes) fills the rest.
export function lookupDTC(code: string): DTCRecord | undefined {
  return DTC_CATALOG[code] ?? DTC_GENERIC[code];
}
