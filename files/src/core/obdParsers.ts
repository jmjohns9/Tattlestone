// ─── OBD response parsers ─────────────────────────────────────────────────────
//
// Pure functions that turn an ELM327 reply (ATH0, ATS0 or ATS1) into data.
// Every parser works on messages, never on the flattened reply: each line is
// one frame from one ECU, and a CAN ISO-TP reply (a length line, then "0:",
// "1:"… segments) is reassembled into a single message first. Flattening the
// reply mixed later frames' SID bytes into the data and invented codes.

export type Message = number[];

const hexBytes = (hex: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.substring(i, i + 2), 16));
  return out;
};

export function responseMessages(raw: string): Message[] {
  const lines = raw
    .split(/[\r\n]+/)
    .map(l => l.replace(/[\s>]/g, '').toUpperCase())
    .filter(Boolean);

  const messages: Message[] = [];
  let multi: { length: number; bytes: number[] } | null = null;

  for (const line of lines) {
    // ISO-TP length line: three hex digits, e.g. "014" for a 20-byte payload
    if (/^[0-9A-F]{3}$/.test(line)) {
      multi = { length: parseInt(line, 16), bytes: [] };
      continue;
    }
    const segment = /^[0-9A-F]:([0-9A-F]*)$/.exec(line);
    if (segment) {
      if (!multi) continue;
      multi.bytes.push(...hexBytes(segment[1]));
      if (multi.bytes.length >= multi.length) {
        messages.push(multi.bytes.slice(0, multi.length));
        multi = null;
      }
      continue;
    }
    // Anything else must be a whole frame of hex bytes; status text such as
    // SEARCHING..., BUS INIT: ...OK and NO DATA is dropped here.
    if (/^([0-9A-F]{2})+$/.test(line)) messages.push(hexBytes(line));
  }
  return messages;
}

// Replies that mean the request never got a real answer. NO DATA is not one:
// it means the bus worked and no ECU had anything to report.
const FAILURE = /UNABLE TO CONNECT|BUS ERROR|CAN ERROR|BUS BUSY|STOPPED|FB ERROR|DATA ERROR|BUFFER FULL|ERROR|^\?$/m;

// ── Negative responses ───────────────────────────────────────────────────────
// An ECU that refuses a request answers 7F <service> … <code>. On CAN the code
// is the third byte; GM Class 2 echoes the request first, so the code is always
// the last byte. Names follow ISO 14229-1 (UDS), which shares 0x10–0x37 and
// 0x78 with ISO 14230 (KWP2000).

export const NRC_NAMES: Readonly<Record<number, string>> = {
  0x10: 'General reject',
  0x11: 'Service not supported',
  0x12: 'Sub-function not supported',
  0x13: 'Incorrect message length or format',
  0x14: 'Response too long',
  0x21: 'Busy, repeat request',
  0x22: 'Conditions not correct',
  0x24: 'Request sequence error',
  0x25: 'No response from sub-net component',
  0x26: 'Failure prevents execution of requested action',
  0x31: 'Request out of range',
  0x33: 'Security access denied',
  0x35: 'Invalid key',
  0x36: 'Exceeded number of attempts',
  0x37: 'Required time delay not expired',
  0x70: 'Upload/download not accepted',
  0x71: 'Transfer data suspended',
  0x72: 'General programming failure',
  0x73: 'Wrong block sequence counter',
  0x78: 'Request received, response pending',
  0x7E: 'Sub-function not supported in active session',
  0x7F: 'Service not supported in active session',
  0x81: 'RPM too high',
  0x82: 'RPM too low',
  0x83: 'Engine is running',
  0x84: 'Engine is not running',
  0x85: 'Engine run time too low',
  0x86: 'Temperature too high',
  0x87: 'Temperature too low',
  0x88: 'Vehicle speed too high',
  0x89: 'Vehicle speed too low',
  0x8A: 'Throttle/pedal too high',
  0x8B: 'Throttle/pedal too low',
  0x8C: 'Transmission range not in neutral',
  0x8D: 'Transmission range not in gear',
  0x8F: 'Brake switch not closed',
  0x90: 'Shifter lever not in park',
  0x91: 'Torque converter clutch locked',
  0x92: 'Voltage too high',
  0x93: 'Voltage too low',
};

export function nrcName(nrc: number): string {
  return NRC_NAMES[nrc] ?? (nrc >= 0x94 && nrc <= 0xEF ? 'Manufacturer-specific condition not correct'
    : nrc >= 0xF0 && nrc <= 0xFE ? 'Manufacturer-specific code' : 'Unknown code');
}

export interface NegativeResponse { service: number; nrc: number; name: string }

/** The first refusal of `service` in a reply, or null if no ECU refused it. */
export function negativeResponse(raw: string, service: number): NegativeResponse | null {
  const m = responseMessages(raw).find(x => x.length >= 3 && x[0] === 0x7F && x[1] === service);
  if (!m) return null;
  const nrc = m[m.length - 1];
  return { service, nrc, name: nrcName(nrc) };
}

/** e.g. "refused: Conditions not correct (NRC 0x22)" */
export const describeRefusal = (n: NegativeResponse): string =>
  `refused: ${n.name} (NRC 0x${n.nrc.toString(16).toUpperCase().padStart(2, '0')})`;

// ── DTCs: Mode 03 (stored), 07 (pending), 0A (permanent) ─────────────────────

const DTC_TYPES = ['P', 'C', 'B', 'U'] as const;

export function decodeDTC(a: number, b: number): string {
  const type = DTC_TYPES[a >> 6];
  const digits = ((a & 0x3F) << 8 | b).toString(16).toUpperCase().padStart(4, '0');
  return type + digits;
}

export function parseDTCResponse(mode: string, raw: string): { ok: boolean; codes: string[] } {
  const sid = parseInt(mode, 16);
  const messages = responseMessages(raw);
  const positive = messages.filter(m => m[0] === sid + 0x40);
  // 7F <mode> <nrc>: the ECU does not support this mode — no codes of this kind
  const negative = messages.some(m => m[0] === 0x7F && m[1] === sid);

  if (positive.length === 0) {
    const text = raw.replace(/>/g, '').trim();
    const ok = negative || (/NO DATA/.test(text) && !FAILURE.test(text));
    return { ok, codes: [] };
  }

  const codes: string[] = [];
  for (const msg of positive) {
    let data = msg.slice(1);
    // CAN (ISO 15765) puts a DTC count before the codes, so its payload is
    // always 1 + 2n bytes. J1850 / ISO 9141 / KWP frames carry pairs only.
    if (data.length % 2 === 1 && data.length === 1 + 2 * data[0]) data = data.slice(1);
    for (let i = 0; i + 1 < data.length; i += 2) {
      if (data[i] === 0 && data[i + 1] === 0) continue;
      const code = decodeDTC(data[i], data[i + 1]);
      if (!codes.includes(code)) codes.push(code);
    }
  }
  return { ok: true, codes };
}

// ── VIN: Mode 09 PID 02 ───────────────────────────────────────────────────────

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function parseVIN(raw: string): string | null {
  const replies = responseMessages(raw).filter(m => m[0] === 0x49 && m[1] === 0x02);
  if (replies.length === 0) return null;

  let bytes: number[];
  if (replies.every(m => m.length === 7)) {
    // J1850 / ISO 9141: five frames of 49 02 <seq> + 4 bytes, the first padded
    // with leading zeros. Order by sequence number, not arrival.
    bytes = [...replies].sort((x, y) => x[2] - y[2]).flatMap(m => m.slice(3));
  } else {
    // CAN: one reassembled payload, 49 02 <item count> + 17 bytes
    const payload = replies.find(m => m.length > 7);
    if (!payload) return null;
    bytes = payload.slice(3);
  }

  const vin = bytes.filter(b => b !== 0).map(b => String.fromCharCode(b)).join('').slice(-17);
  return VIN_PATTERN.test(vin) ? vin : null;
}

// ── Mode 09 vehicle information ──────────────────────────────────────────────
// J1850 / ISO 9141 answer in 7-byte frames, 49 <type> <seq> + 4 bytes, with the
// sequence restarting at 1 for each ECU. CAN answers one reassembled message
// per ECU, 49 <type> <item count> + data.

/** Data bytes of one Mode 09 info type, one array per answering ECU. */
export function mode09Payloads(type: number, raw: string): number[][] {
  const replies = responseMessages(raw).filter(m => m.length > 3 && m[0] === 0x49 && m[1] === type);
  const out: number[][] = [];
  let group: number[][] = [];
  const flush = () => {
    if (group.length) out.push([...group].sort((a, b) => a[2] - b[2]).flatMap(m => m.slice(3)));
    group = [];
  };
  for (const m of replies) {
    if (m.length === 7) {
      // A sequence number seen again starts the next ECU's reply; frames
      // merely arriving out of order stay together and are sorted
      if (group.some(g => g[2] === m[2])) flush();
      group.push(m);
    } else {
      flush();
      out.push(m.slice(3));
    }
  }
  flush();
  return out;
}

const ascii = (bytes: number[]): string =>
  bytes.filter(b => b >= 0x20 && b < 0x7F).map(b => String.fromCharCode(b)).join('').trim();

/** Fixed-width text items: calibration IDs (16 chars), ECU names (20 chars). */
export function parseMode09Text(type: number, raw: string, width: number): string[] {
  const items: string[] = [];
  for (const bytes of mode09Payloads(type, raw)) {
    for (let i = 0; i < bytes.length; i += width) {
      const text = ascii(bytes.slice(i, i + width));
      if (text) items.push(text);
    }
  }
  return items;
}

/** Calibration verification numbers: 4 bytes each, shown as hex. */
export function parseCVNs(raw: string): string[] {
  const out: string[] = [];
  for (const bytes of mode09Payloads(0x06, raw)) {
    for (let i = 0; i + 3 < bytes.length; i += 4) {
      out.push(bytes.slice(i, i + 4).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(''));
    }
  }
  return out;
}

/** Info types 01–20 the ECUs report as supported (0900), or null if none answered. */
export function parseMode09Support(raw: string): Set<number> | null {
  const masks = responseMessages(raw).filter(m => m.length >= 6 && m[0] === 0x49 && m[1] === 0x00)
    .map(m => (m.length === 7 ? m.slice(3) : m.slice(2, 6)));
  if (!masks.length) return null;
  const set = new Set<number>();
  for (const b of masks) {
    const mask = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    for (let bit = 0; bit < 32; bit++) if (mask & (1 << (31 - bit))) set.add(bit + 1);
  }
  return set;
}

// ── Mode 01 PIDs ──────────────────────────────────────────────────────────────

// Data bytes from every ECU that answered this PID, in arrival order.
export function parsePIDMessages(pid: string, raw: string): number[][] {
  const sid = parseInt(pid.substring(0, 2), 16) + 0x40;
  const pidByte = parseInt(pid.substring(2), 16);
  return responseMessages(raw)
    .filter(m => m.length > 2 && m[0] === sid && m[1] === pidByte)
    .map(m => m.slice(2));
}

// Data bytes from the first ECU that answered, or null.
export function parsePIDData(pid: string, raw: string): number[] | null {
  return parsePIDMessages(pid, raw)[0] ?? null;
}
