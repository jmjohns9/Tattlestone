import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';

// ─── VIN decoding ─────────────────────────────────────────────────────────────
//
// Offline first: @cardog/corgi decodes against a bundled copy of NHTSA's vPIC
// database, so a VIN decodes with no network. The online vPIC API is asked in
// parallel and wins field by field, because it also knows trim and
// transmission. Either source alone is enough.

export interface DecodedVin {
  year: string;
  make: string;
  model: string;
  engine: string;
  trim: string;
  transmission: string;
}

export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

const EMPTY: DecodedVin = { year: '', make: '', model: '', engine: '', trim: '', transmission: '' };

export function engineLabel(displacementL?: string | number, cylinders?: string | number, fuel?: string): string {
  const disp = displacementL ? `${Number(displacementL) ? Number(displacementL).toFixed(1) : displacementL}L` : '';
  return [disp, cylinders ? `${cylinders}-cyl` : '', fuel ?? ''].filter(Boolean).join(' ');
}

/** Online values override offline ones, except where online is blank. */
export function mergeDecoded(offline: DecodedVin | null, online: DecodedVin | null): DecodedVin | null {
  if (!offline && !online) return null;
  const out = { ...EMPTY, ...offline };
  for (const k of Object.keys(EMPTY) as Array<keyof DecodedVin>) {
    if (online?.[k]) out[k] = online[k];
  }
  return out.make || out.model ? out : null;
}

// ── Online (vPIC API) ─────────────────────────────────────────────────────────

export async function decodeOnline(vin: string): Promise<DecodedVin | null> {
  try {
    // Bounded: on a dead or captive network in the field this could hang for minutes
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const json: any = await res.json();
    const r = json.Results?.[0];
    if (!r) return null;
    return {
      year: r.ModelYear ?? '',
      make: r.Make ?? '',
      model: r.Model ?? '',
      engine: engineLabel(r.DisplacementL, r.EngineCylinders, r.FuelTypePrimary),
      trim: r.Trim ?? '',
      transmission: r.TransmissionStyle ?? '',
    };
  } catch {
    return null;
  }
}

// ── Offline (corgi + bundled vPIC) ────────────────────────────────────────────

type CorgiDecoder = { decode: (vin: string) => Promise<any>; close: () => Promise<void> };
let decoderPromise: Promise<CorgiDecoder> | null = null;

// corgi ships the database gzipped; unpack it once into userData. The file
// name carries corgi's version so an upgrade unpacks the new database.
async function preparedDatabase(dataDir: string): Promise<string> {
  // package.json isn't in corgi's exports map; resolve the entry (dist/index.cjs)
  const pkgDir = path.resolve(path.dirname(require.resolve('@cardog/corgi')), '..');
  const version: string = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8')).version;
  const dbPath = path.join(dataDir, 'vpic', `vpic-${version}.lite.db`);
  if (fs.existsSync(dbPath)) return dbPath;

  await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.${process.pid}.tmp`;
  try {
    await pipeline(fs.createReadStream(path.join(pkgDir, 'dist', 'db', 'vpic.lite.db.gz')), zlib.createGunzip(), fs.createWriteStream(tmp));
    await fs.promises.rename(tmp, dbPath);
  } catch (e) {
    await fs.promises.rm(tmp, { force: true });
    throw e;
  }
  // Drop databases left by earlier corgi versions
  for (const f of await fs.promises.readdir(path.dirname(dbPath))) {
    if (f !== path.basename(dbPath)) await fs.promises.rm(path.join(path.dirname(dbPath), f), { force: true });
  }
  return dbPath;
}

function getDecoder(dataDir: string): Promise<CorgiDecoder> {
  decoderPromise ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createDecoder } = require('@cardog/corgi') as { createDecoder: (o: { databasePath: string }) => Promise<CorgiDecoder> };
    return createDecoder({ databasePath: await preparedDatabase(dataDir) });
  })();
  decoderPromise.catch(() => { decoderPromise = null; });   // retry on the next decode
  return decoderPromise;
}

export async function decodeOffline(vin: string, dataDir: string): Promise<DecodedVin | null> {
  try {
    const r = await (await getDecoder(dataDir)).decode(vin);
    const v = r?.components?.vehicle;
    if (!r?.valid || !v?.make) return null;
    const e = r.components.engine ?? {};
    return {
      year: v.year ? String(v.year) : '',
      make: v.make ?? '',
      model: v.model ?? '',
      engine: engineLabel(e.displacement, e.cylinders, e.fuel ?? v.fuelType),
      trim: v.trim ?? v.series ?? '',
      transmission: v.transmission ?? '',
    };
  } catch {
    return null;
  }
}

export async function closeVinDecoder(): Promise<void> {
  const p = decoderPromise;
  decoderPromise = null;
  if (p) await (await p.catch(() => null))?.close();
}

export async function decodeVin(vin: string, dataDir: string): Promise<DecodedVin | null> {
  if (!VIN_RE.test(vin)) return null;
  const [offline, online] = await Promise.all([decodeOffline(vin, dataDir), decodeOnline(vin)]);
  return mergeDecoded(offline, online);
}
