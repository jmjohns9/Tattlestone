import {
  NhtsaRecall, NhtsaBulletin, NhtsaComplaint, NhtsaComplaintSummary, NhtsaSection, VehicleSafetyReport,
} from '../shared/types';

// ─── NHTSA recalls, bulletins and complaints ─────────────────────────────────
//
// All public-domain US government data, no API key. Recalls and complaints use
// NHTSA's documented endpoints. Manufacturer communications (TSBs, GM PIs,
// special coverage) come from the byYmmt endpoint that nhtsa.gov's own vehicle
// pages use; it isn't documented, so a failure there only blanks that section.

const API = 'https://api.nhtsa.gov';
const TIMEOUT_MS = 20_000;
const CACHE_MS = 30 * 60_000;
const LIST_LIMIT = 50;

export const DTC_RE = /\b[PBCU][0-3][0-9A-F]{3}\b/g;

export function codesIn(text: string): string[] {
  return [...new Set((text.toUpperCase().match(DTC_RE) ?? []))];
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** NHTSA mixes 'DD/MM/YYYY' (recalls), 'MM/DD/YYYY' (complaints) and ISO. */
export function isoDate(v: unknown, order: 'dmy' | 'mdy'): string {
  const s = str(v);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) {
    const [dd, mm] = order === 'dmy' ? [m[1], m[2]] : [m[2], m[1]];
    return `${m[3]}-${mm}-${dd}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

const byDateDesc = <T extends { date: string }>(a: T, b: T): number => b.date.localeCompare(a.date);

export function parseRecalls(json: any): NhtsaRecall[] {
  const rows: any[] = Array.isArray(json?.results) ? json.results : [];
  const seen = new Set<string>();
  return rows.map(r => ({
    campaign: str(r.NHTSACampaignNumber),
    manufacturer: str(r.Manufacturer),
    component: str(r.Component),
    reportDate: isoDate(r.ReportReceivedDate, 'dmy'),
    summary: str(r.Summary),
    consequence: str(r.Consequence),
    remedy: str(r.Remedy),
  }))
    .filter(r => r.campaign && !seen.has(r.campaign) && seen.add(r.campaign))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

export function parseBulletins(json: any): NhtsaBulletin[] {
  const vehicles: any[] = Array.isArray(json?.results) ? json.results : [];
  const seen = new Set<number>();
  const out: NhtsaBulletin[] = [];
  for (const v of vehicles) {
    for (const c of v?.safetyIssues?.manufacturerCommunications ?? []) {
      const id = Number(c?.nhtsaIdNumber);
      if (!Number.isInteger(id) || seen.has(id)) continue;
      seen.add(id);
      const summary = str(c.summary) || str(c.subject);
      out.push({
        id,
        number: str(c.manufacturerCommunicationNumber),
        date: isoDate(c.communicationDate, 'mdy'),
        components: (Array.isArray(c.components) ? c.components : []).map((x: any) => str(x?.name)).filter(Boolean),
        summary,
        codes: codesIn(summary),
      });
    }
  }
  return out.sort(byDateDesc);
}

/** A complaint as parsed; injuries and deaths only feed the totals. */
export type ParsedComplaint = NhtsaComplaint & { injuries: number; deaths: number };

export function parseComplaints(json: any): ParsedComplaint[] {
  const rows: any[] = Array.isArray(json?.results) ? json.results : [];
  return rows.map(r => ({
    id: Number(r.odiNumber) || 0,
    date: isoDate(r.dateComplaintFiled, 'mdy'),
    components: str(r.components).split(',').map(s => s.trim()).filter(Boolean),
    summary: str(r.summary),
    crash: r.crash === true,
    fire: r.fire === true,
    injuries: Number(r.numberOfInjuries) || 0,
    deaths: Number(r.numberOfDeaths) || 0,
  })).sort(byDateDesc);
}

export function summarizeComplaints(all: ParsedComplaint[], codes: string[]): NhtsaComplaintSummary {
  const counts = new Map<string, number>();
  for (const c of all) for (const comp of c.components) counts.set(comp, (counts.get(comp) ?? 0) + 1);
  const wanted = new Set(codes.map(c => c.toUpperCase()));
  const strip = ({ id, date, components, summary, crash, fire }: NhtsaComplaint): NhtsaComplaint =>
    ({ id, date, components, summary, crash, fire });
  return {
    total: all.length,
    crashes: all.filter(c => c.crash).length,
    fires: all.filter(c => c.fire).length,
    injuries: all.reduce((n, c) => n + c.injuries, 0),
    deaths: all.reduce((n, c) => n + c.deaths, 0),
    byComponent: [...counts].map(([component, count]) => ({ component, count })).sort((a, b) => b.count - a.count),
    mentioningCodes: wanted.size
      ? all.filter(c => codesIn(c.summary).some(code => wanted.has(code))).slice(0, LIST_LIMIT).map(strip)
      : [],
    recent: all.slice(0, LIST_LIMIT).map(strip),
  };
}

// ── Fetching ──────────────────────────────────────────────────────────────────

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`NHTSA HTTP ${res.status}`);
  return res.json();
}

async function section<T>(load: () => Promise<T>): Promise<NhtsaSection<T>> {
  try { return { ok: true, data: await load() }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

const q = (s: string): string => encodeURIComponent(s.trim());

interface RawReport {
  model: string;
  recalls: NhtsaSection<NhtsaRecall[]>;
  bulletins: NhtsaSection<NhtsaBulletin[]>;
  complaints: NhtsaSection<ParsedComplaint[]>;
  fetchedAt: number;
}

async function fetchRaw(year: string, make: string, model: string): Promise<RawReport> {
  const ymm = `make=${q(make)}&model=${q(model)}&modelYear=${q(year)}`;
  const [recalls, bulletins, complaints] = await Promise.all([
    section(async () => parseRecalls(await getJson(`${API}/recalls/recallsByVehicle?${ymm}`))),
    // max=1: every trim of a model year carries the same communications
    section(async () => parseBulletins(await getJson(`${API}/vehicles/byYmmt?${ymm}&data=manufacturercommunications&productDetail=minimal&max=1`))),
    section(async () => parseComplaints(await getJson(`${API}/complaints/complaintsByVehicle?${ymm}`))),
  ]);
  return { model, recalls, bulletins, complaints, fetchedAt: Date.now() };
}

/** True when any section came back with records. NHTSA answers an unknown
 *  model with HTTP 400 on some endpoints and an empty list on others. */
export const foundAnything = (r: Pick<RawReport, 'recalls' | 'bulletins' | 'complaints'>): boolean =>
  [r.recalls, r.bulletins, r.complaints].some(s => s.ok && s.data.length > 0);

const cache = new Map<string, RawReport>();

export function validVehicle(v: { year?: unknown; make?: unknown; model?: unknown }): v is { year: string; make: string; model: string } {
  return typeof v.year === 'string' && /^(19[5-9]\d|20\d{2})$/.test(v.year.trim())
    && typeof v.make === 'string' && v.make.trim().length > 0 && v.make.length <= 40
    && typeof v.model === 'string' && v.model.trim().length > 0 && v.model.length <= 60;
}

export async function fetchVehicleSafety(
  v: { year: string; make: string; model: string }, codes: string[], opts: { refresh?: boolean } = {},
): Promise<VehicleSafetyReport> {
  const key = `${v.year}|${v.make}|${v.model}`.trim().toLowerCase();
  let raw = opts.refresh ? undefined : cache.get(key);
  if (!raw || Date.now() - raw.fetchedAt > CACHE_MS) {
    raw = await fetchRaw(v.year, v.make, v.model);
    // NHTSA names models plainly ("SILVERADO"); "Silverado 1500" finds nothing
    const base = v.model.trim().split(/\s+/)[0];
    if (!foundAnything(raw) && base && base.toLowerCase() !== v.model.trim().toLowerCase()) {
      const retry = await fetchRaw(v.year, v.make, base);
      if (foundAnything(retry)) raw = retry;
    }
    // Don't cache a report that failed outright, so Refresh retries it
    if (raw.recalls.ok || raw.bulletins.ok || raw.complaints.ok) cache.set(key, raw);
  }
  return {
    year: v.year, make: v.make, model: raw.model, fetchedAt: raw.fetchedAt,
    recalls: raw.recalls,
    bulletins: raw.bulletins,
    complaints: raw.complaints.ok
      ? { ok: true, data: summarizeComplaints(raw.complaints.data, codes) }
      : raw.complaints,
  };
}

/** The PDF of one manufacturer communication, from NHTSA's document store only. */
export async function bulletinPdfUrl(nhtsaId: number): Promise<string | null> {
  const json = await getJson(`${API}/safetyIssues/byNhtsaId?nhtsaId=${nhtsaId}&filter=issueType&filterValue=manufacturerCommunications`);
  for (const r of json?.results ?? []) {
    for (const c of r?.manufacturerCommunications ?? []) {
      for (const d of c?.associatedDocuments ?? []) {
        const url = str(d?.url);
        if (url.startsWith('https://static.nhtsa.gov/')) return url;
      }
    }
  }
  return null;
}
