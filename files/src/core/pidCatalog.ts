import { PIDDefinition } from '../shared/types';

// ─── SAE J1979 Formula helpers ─────────────────────────────────────────────────

const pct1   = (b: number[]) => parseFloat(((b[0] / 255) * 100).toFixed(1));
const pct2   = (b: number[]) => parseFloat((((b[0] * 256 + b[1]) * 100) / 255).toFixed(1));
const trim   = (b: number[]) => parseFloat((((b[0] - 128) / 128) * 100).toFixed(1));
const tempC  = (b: number[]) => b[0] - 40;
const tempF  = (b: number[]) => parseFloat(((b[0] - 40) * 9 / 5 + 32).toFixed(1));
const rpm    = (b: number[]) => parseFloat(((b[0] * 256 + b[1]) / 4).toFixed(0));
const speed  = (b: number[]) => b[0];  // km/h
const kpa1   = (b: number[]) => b[0];  // kPa direct
const psi1   = (b: number[]) => parseFloat((b[0] * 0.14504).toFixed(1));
const volt1  = (b: number[]) => parseFloat(((b[0] * 256 + b[1]) / 1000).toFixed(3));
const maf    = (b: number[]) => parseFloat(((b[0] * 256 + b[1]) / 100).toFixed(2));
const timing = (b: number[]) => parseFloat(((b[0] / 2) - 64).toFixed(1));
const o2v    = (b: number[]) => parseFloat((b[0] / 200).toFixed(3));
const lph    = (b: number[]) => parseFloat(((b[0] * 256 + b[1]) / 20).toFixed(2));

// ─── PID Catalog ──────────────────────────────────────────────────────────────

export const PID_CATALOG: PIDDefinition[] = [

  // ── Engine ──────────────────────────────────────────────────────────────────
  {
    pid: '010C',
    name: 'Engine Crankshaft Speed',
    shortName: 'Engine RPM',
    category: 'engine',
    unit: 'rpm',
    min: 0,
    max: 8000,
    formula: '((byte A × 256) + byte B) ÷ 4',
    description: 'Crankshaft rotation speed. Core timing reference for all Engine Control Module calculations. The 5.3 L Vortec V8 redlines at 6,000 rpm.',
    decode: rpm,
    format: (v) => `${v} rpm`,
    warnHigh: 5500,
    critHigh: 6000,
  },
  {
    pid: '010D',
    name: 'Vehicle Road Speed',
    shortName: 'Speed',
    category: 'engine',
    unit: 'km/h',
    min: 0,
    max: 255,
    formula: 'byte A (km/h direct)',
    description: 'Wheel speed from the Vehicle Speed Sensor on the transmission output shaft.',
    decode: speed,
    format: (v) => `${v} km/h`,
  },
  {
    pid: '0104',
    name: 'Calculated Engine Load',
    shortName: 'Eng Load',
    category: 'engine',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Ratio of current air intake to maximum possible at this engine speed. Shows how hard the engine is working.',
    decode: pct1,
    format: (v) => `${v}%`,
    warnHigh: 85,
  },
  {
    pid: '0111',
    name: 'Throttle Plate Opening Position',
    shortName: 'Throttle',
    category: 'engine',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Throttle body butterfly plate angle measured by the Throttle Position Sensor. 0% = fully closed; 100% = wide-open throttle.',
    decode: pct1,
    format: (v) => `${v}%`,
  },
  {
    pid: '0145',
    name: 'Relative Throttle Position',
    shortName: 'Rel Throttle',
    category: 'engine',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Throttle position relative to the Engine Control Module\'s learned closed-position stop. More accurate than 0111 at idle.',
    decode: pct1,
    format: (v) => `${v}%`,
  },
  {
    pid: '0147',
    name: 'Absolute Throttle Position B (Redundant Sensor)',
    shortName: 'TPS-B',
    category: 'engine',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Second Throttle Position Sensor for redundancy. A large difference from parameter 0111 indicates a sensor fault.',
    decode: pct1,
    format: (v) => `${v}%`,
  },
  {
    pid: '010E',
    name: 'Ignition Timing Advance — Cylinder 1 Reference',
    shortName: 'Timing Adv',
    category: 'engine',
    unit: '° BTDC',
    min: -64,
    max: 63.5,
    formula: '(byte A ÷ 2) − 64',
    description: 'Degrees before top dead center at which the spark fires. The Engine Control Module retards timing on knock detection.',
    decode: timing,
    format: (v) => `${v}° BTDC`,
    warnLow: 0,
  },
  {
    pid: '0110',
    name: 'Mass Air Flow Rate',
    shortName: 'MAF',
    category: 'engine',
    unit: 'g/s',
    min: 0,
    max: 655.35,
    formula: '((byte A × 256) + byte B) ÷ 100',
    description: 'Mass of air entering the intake per second via the hot-wire Mass Air Flow sensor. Core Engine Control Module input for fuel injection calculation.',
    decode: maf,
    format: (v) => `${v} g/s`,
  },
  {
    pid: '010B',
    name: 'Intake Manifold Absolute Pressure',
    shortName: 'MAP',
    category: 'engine',
    unit: 'psi',
    min: 0,
    max: 36.99,
    formula: 'byte A × 0.14504 (kilopascal to psi)',
    description: 'Absolute pressure inside the intake manifold. Low at idle due to vacuum; rises toward atmospheric at wide-open throttle.',
    decode: psi1,
    format: (v) => `${v} psi`,
  },
  {
    pid: '0143',
    name: 'Absolute Load Value',
    shortName: 'Abs Load',
    category: 'engine',
    unit: '%',
    min: 0,
    max: 25700,
    formula: '((byte A × 256) + byte B) × 100 ÷ 255',
    description: 'Absolute percentage of maximum possible air intake at current conditions, independent of engine speed.',
    decode: pct2,
    format: (v) => `${v}%`,
  },

  // ── Temperature ──────────────────────────────────────────────────────────────
  {
    pid: '0105',
    name: 'Engine Coolant Temperature',
    shortName: 'Coolant Temp',
    category: 'temperature',
    unit: '°F',
    min: -40,
    max: 419,
    formula: '(byte A − 40) × 9 ÷ 5 + 32',
    description: 'Coolant temperature at the thermostat housing. Drives fuel enrichment and ignition timing maps in the Engine Control Module.',
    decode: tempF,
    format: (v) => `${v} °F`,
    warnHigh: 230,
    critHigh: 240,
  },
  {
    pid: '015C',
    name: 'Engine Oil Temperature',
    shortName: 'Oil Temp',
    category: 'temperature',
    unit: '°F',
    min: -40,
    max: 419,
    formula: '(byte A − 40) × 9 ÷ 5 + 32',
    description: 'Engine oil temperature in the sump. High oil temperature degrades lubrication film strength.',
    decode: tempF,
    format: (v) => `${v} °F`,
    warnHigh: 250,
    critHigh: 270,
  },
  {
    pid: '010F',
    name: 'Intake Air Temperature',
    shortName: 'IAT',
    category: 'temperature',
    unit: '°F',
    min: -40,
    max: 419,
    formula: '(byte A − 40) × 9 ÷ 5 + 32',
    description: 'Air temperature at the Mass Air Flow / Intake Air Temperature sensor. High intake air temperature reduces engine power.',
    decode: tempF,
    format: (v) => `${v} °F`,
  },
  {
    pid: '0146',
    name: 'Ambient Outside Air Temperature',
    shortName: 'Ambient Temp',
    category: 'temperature',
    unit: '°F',
    min: -40,
    max: 419,
    formula: '(byte A − 40) × 9 ÷ 5 + 32',
    description: 'Outside air temperature from the sensor near the front bumper. Used to correct battery state of health estimates.',
    decode: tempF,
    format: (v) => `${v} °F`,
  },

  // ── Fuel ─────────────────────────────────────────────────────────────────────
  {
    pid: '0106',
    name: 'Short-Term Fuel Trim — Bank 1 (Cylinder 1 Side)',
    shortName: 'STFT Bank 1',
    category: 'fuel',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: '((byte A − 128) ÷ 128) × 100',
    description: 'Instant Engine Control Module fuel correction for the Bank 1 cylinders based on oxygen sensor feedback. On the GM V8, Bank 1 is the driver side (cylinders 1, 3, 5, 7). Positive = lean (adding fuel).',
    decode: trim,
    format: (v) => { const n = v as number; return `${n > 0 ? '+' : ''}${n}%`; },
    warnLow: -10,
    warnHigh: 10,
    critLow: -25,
    critHigh: 25,
  },
  {
    pid: '0107',
    name: 'Long-Term Fuel Trim — Bank 1 (Cylinder 1 Side)',
    shortName: 'LTFT Bank 1',
    category: 'fuel',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: '((byte A − 128) ÷ 128) × 100',
    description: 'Learned persistent fuel correction stored in Engine Control Module memory for Bank 1. High positive value = lean condition.',
    decode: trim,
    format: (v) => { const n = v as number; return `${n > 0 ? '+' : ''}${n}%`; },
    warnLow: -10,
    warnHigh: 10,
    critLow: -25,
    critHigh: 25,
  },
  {
    pid: '0108',
    name: 'Short-Term Fuel Trim — Bank 2 (Opposite Cylinder 1)',
    shortName: 'STFT Bank 2',
    category: 'fuel',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: '((byte A − 128) ÷ 128) × 100',
    description: 'Instant fuel correction for the Bank 2 cylinders. On the GM V8, Bank 2 is the passenger side (cylinders 2, 4, 6, 8). Both banks lean simultaneously points to an upstream cause.',
    decode: trim,
    format: (v) => { const n = v as number; return `${n > 0 ? '+' : ''}${n}%`; },
    warnLow: -10,
    warnHigh: 10,
  },
  {
    pid: '0109',
    name: 'Long-Term Fuel Trim — Bank 2 (Opposite Cylinder 1)',
    shortName: 'LTFT Bank 2',
    category: 'fuel',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: '((byte A − 128) ÷ 128) × 100',
    description: 'Learned correction for Bank 2. Both banks above +7% signals a global lean condition.',
    decode: trim,
    format: (v) => { const n = v as number; return `${n > 0 ? '+' : ''}${n}%`; },
    warnLow: -10,
    warnHigh: 10,
  },
  {
    pid: '012F',
    name: 'Fuel Tank Level Remaining',
    shortName: 'Fuel Level',
    category: 'fuel',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Fuel level sensor signal from the sender float in the fuel tank.',
    decode: pct1,
    format: (v) => `${v}%`,
    warnLow: 15,
    critLow: 5,
  },
  {
    pid: '0123',
    name: 'Fuel Rail Gauge Pressure',
    shortName: 'Fuel Rail PSI',
    category: 'fuel',
    unit: 'psi',
    min: 0,
    max: 95050,
    formula: '((byte A × 256) + byte B) × 10 kPa → × 0.14504 for psi',
    description: 'Fuel rail pressure above atmospheric. The 5.3 L Vortec uses a returnless rail controlled by the Engine Control Module. Spec: 55–60 psi.',
    decode: (b) => parseFloat(((b[0] * 256 + b[1]) * 10 * 0.14504).toFixed(1)),
    format: (v) => `${v} psi`,
    warnLow: 50,
    warnHigh: 65,
  },
  {
    pid: '015E',
    name: 'Engine Fuel Consumption Rate',
    shortName: 'Fuel Rate',
    category: 'fuel',
    unit: 'L/h',
    min: 0,
    max: 3276.75,
    formula: '((byte A × 256) + byte B) ÷ 20',
    description: 'Instantaneous fuel flow rate calculated from injector duty cycle.',
    decode: lph,
    format: (v) => `${v} L/h`,
  },
  {
    pid: '015D',
    name: 'Fuel Injection Timing — Commanded Angle',
    shortName: 'Inj Timing',
    category: 'fuel',
    unit: '°',
    min: -210,
    max: 301.99,
    formula: '((byte A × 256) + byte B) ÷ 128 − 210',
    description: 'Angle at which fuel injection begins relative to top dead center. Advanced at higher load.',
    decode: (b) => parseFloat(((b[0] * 256 + b[1]) / 128 - 210).toFixed(2)),
    format: (v) => `${v}°`,
  },
  {
    pid: '0103',
    name: 'Fuel System Status — System 1 (Closed or Open Loop)',
    shortName: 'Fuel System',
    category: 'fuel',
    unit: '',
    min: 0,
    max: 16,
    formula: 'Byte A: one bit set per SAE J1979 (byte B is fuel system 2)',
    description: 'Whether the Engine Control Module is using oxygen sensor feedback (closed loop = normal) or a fixed fuel map (open loop: cold start, full throttle or deceleration, or a fault).',
    decode: (b) => b[0],
    format: (v) => {
      const map: { [k: number]: string } = {
        0: 'Not reported',
        1: 'Open loop — engine cold',
        2: 'Closed loop',
        4: 'Open loop — driving conditions',
        8: 'Open loop — system fault',
        16: 'Closed loop — O2 sensor fault',
      };
      return map[v as number] ?? `Status ${v}`;
    },
  },

  // ── Electrical ───────────────────────────────────────────────────────────────
  {
    pid: '0142',
    name: 'Engine Control Module Supply Rail Voltage',
    shortName: 'ECM Voltage',
    category: 'electrical',
    unit: 'V',
    min: 0,
    max: 65.535,
    formula: '((byte A × 256) + byte B) ÷ 1000',
    description: 'Battery voltage at the Engine Control Module reference pin. Compare to adapter reading to check wiring resistance drop.',
    decode: volt1,
    format: (v) => `${v} V`,
    warnLow: 11.5,
    critLow: 11.0,
  },
  {
    pid: '0133',
    name: 'Barometric Pressure (Atmospheric)',
    shortName: 'Baro Pressure',
    category: 'electrical',
    unit: 'inHg',
    min: 0,
    max: 75.3,
    formula: 'byte A × 0.29530 (kilopascal to inches of mercury)',
    description: 'Atmospheric pressure used to compensate Mass Air Flow and altitude-sensitive fuel calculations.',
    decode: (b) => parseFloat((b[0] * 0.29530).toFixed(2)),
    format: (v) => `${v} inHg`,
  },

  // ── Oxygen Sensors ───────────────────────────────────────────────────────────
  {
    pid: '0114',
    name: 'Oxygen Sensor Voltage — Bank 1, Upstream (Pre-Catalytic Converter)',
    shortName: 'O2 B1S1',
    category: 'oxygen_sensors',
    unit: 'V',
    min: 0,
    max: 1.275,
    formula: 'byte A ÷ 200',
    description: 'Upstream oxygen sensor on Bank 1, before the catalytic converter. Should oscillate rapidly between 0.1–0.9 V in closed-loop fuel control.',
    decode: o2v,
    format: (v) => `${v} V`,
  },
  {
    pid: '0115',
    name: 'Oxygen Sensor Voltage — Bank 1, Downstream (Post-Catalytic Converter)',
    shortName: 'O2 B1S2',
    category: 'oxygen_sensors',
    unit: 'V',
    min: 0,
    max: 1.275,
    formula: 'byte A ÷ 200',
    description: 'Downstream catalytic converter monitor sensor on Bank 1. A steady reading around 0.65 V indicates a healthy catalytic converter.',
    decode: o2v,
    format: (v) => `${v} V`,
  },
  {
    pid: '0118',
    name: 'Oxygen Sensor Voltage — Bank 2, Upstream (Pre-Catalytic Converter)',
    shortName: 'O2 B2S1',
    category: 'oxygen_sensors',
    unit: 'V',
    min: 0,
    max: 1.275,
    formula: 'byte A ÷ 200',
    description: 'Upstream oxygen sensor on Bank 2 (passenger side on the GM V8). Should oscillate rapidly in closed-loop fuel control.',
    decode: o2v,
    format: (v) => `${v} V`,
  },
  {
    pid: '0119',
    name: 'Oxygen Sensor Voltage — Bank 2, Downstream (Post-Catalytic Converter)',
    shortName: 'O2 B2S2',
    category: 'oxygen_sensors',
    unit: 'V',
    min: 0,
    max: 1.275,
    formula: 'byte A ÷ 200',
    description: 'Post-catalytic converter sensor on Bank 2. Steady reading indicates catalyst is functioning correctly.',
    decode: o2v,
    format: (v) => `${v} V`,
  },

  // ── Transmission ─────────────────────────────────────────────────────────────
  {
    pid: '01A4',
    name: 'Transmission Actual Gear',
    shortName: 'Gear',
    category: 'transmission',
    unit: '',
    min: 0,
    max: 15,
    formula: 'Upper 4 bits of byte B (byte A = support bits, C·256+D = ratio × 1000)',
    description: 'Current gear as reported by the Transmission Control Module (SAE J1979 PID A4). Many pre-2010 vehicles do not support it.',
    decode: (b) => (b.length >= 2 ? b[1] >> 4 : NaN),
    format: (v) => {
      const n = v as number;
      if (!Number.isFinite(n)) return '—';
      if (n === 0) return 'Neutral';
      return `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`;
    },
  },

  // ── Emissions ────────────────────────────────────────────────────────────────
  {
    pid: '0101',
    name: 'Monitor Status Since DTCs Cleared (MIL and I/M Readiness)',
    shortName: 'Readiness',
    category: 'emissions',
    unit: '',
    min: 0,
    max: 127,
    formula: 'A: bit 7 MIL, bits 0-6 stored codes; B-D: monitor available / incomplete bits',
    description: 'Check-engine lamp state, the number of stored emission codes, and which I/M readiness monitors have completed since codes were last cleared. The Vehicle health screen decodes the monitor bits.',
    decode: (b) => b[0] & 0x7F,
    format: (v) => `${v} stored code${v === 1 ? '' : 's'}`,
  },
  {
    pid: '012C',
    name: 'Exhaust Gas Recirculation Valve — Commanded Position',
    shortName: 'EGR Cmd',
    category: 'emissions',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Exhaust Gas Recirculation valve position commanded by the Engine Control Module to reduce nitrogen oxide emissions. 0% at idle is normal.',
    decode: pct1,
    format: (v) => `${v}%`,
  },
  {
    pid: '012D',
    name: 'Exhaust Gas Recirculation Error — Actual vs Commanded Deviation',
    shortName: 'EGR Error',
    category: 'emissions',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: '((byte A − 128) ÷ 128) × 100',
    description: 'Deviation between the commanded and actual Exhaust Gas Recirculation valve position. High error suggests a stuck or leaking valve.',
    decode: trim,
    format: (v) => { const n = v as number; return `${n > 0 ? '+' : ''}${n}%`; },
    warnLow: -15,
    warnHigh: 15,
  },
  {
    pid: '012E',
    name: 'Evaporative Emission Control Purge Valve Duty Cycle',
    shortName: 'EVAP Purge',
    category: 'emissions',
    unit: '%',
    min: 0,
    max: 100,
    formula: '(byte A ÷ 255) × 100',
    description: 'Evaporative Emission Control canister purge valve duty cycle. If stuck open at idle it introduces excess fuel vapour causing a lean condition.',
    decode: pct1,
    format: (v) => `${v}%`,
  },

  ...extendedPIDs(),
];

// ─── Extended PIDs (SAE J1979) ────────────────────────────────────────────────
// Polled only when the ECU reports them as supported (see POLLING_EXTENDED).
// Formulas are from SAE J1979; units follow the rest of the catalog (°F, psi).

function extendedPIDs(): PIDDefinition[] {
  const u16 = (b: number[]) => b[0] * 256 + b[1];
  const s16 = (b: number[]) => { const n = u16(b); return n >= 0x8000 ? n - 0x10000 : n; };
  const lambda = (b: number[]) => parseFloat(((2 / 65536) * u16(b)).toFixed(3));
  const catF = (b: number[]) => parseFloat(((u16(b) / 10 - 40) * 9 / 5 + 32).toFixed(0));
  const kpaToPsi = (kpa: number) => parseFloat((kpa * 0.14504).toFixed(1));
  const signedPct = (n: number) => `${n > 0 ? '+' : ''}${n}%`;
  const km = (v: number | string) => `${v} km (${Math.round((v as number) * 0.621371)} mi)`;
  const minutes = (v: number | string) => {
    const n = v as number;
    return n < 60 ? `${n} min` : `${Math.floor(n / 60)} h ${n % 60} min`;
  };

  const out: PIDDefinition[] = [];
  const add = (d: Omit<PIDDefinition, 'min' | 'max'> & { min?: number; max?: number }) =>
    out.push({ min: 0, max: 100, ...d });

  // ── Since codes were cleared: shows a recent clear before a sale ──────────
  add({ pid: '0130', name: 'Warm-ups Since Codes Cleared', shortName: 'Warm-ups', category: 'emissions', unit: '', max: 255,
    formula: 'byte A', description: 'Engine warm-up cycles since the fault codes were last cleared. A low count on a used vehicle means the codes were cleared recently.',
    decode: (b) => b[0], format: (v) => `${v}` });
  add({ pid: '0131', name: 'Distance Since Codes Cleared', shortName: 'Dist Cleared', category: 'emissions', unit: 'km', max: 65535,
    formula: '(byte A × 256) + byte B', description: 'Distance driven since the fault codes were last cleared. A short distance on a used vehicle means the codes were cleared recently.',
    decode: u16, format: km });
  add({ pid: '014E', name: 'Time Since Codes Cleared', shortName: 'Time Cleared', category: 'emissions', unit: 'min', max: 65535,
    formula: '(byte A × 256) + byte B', description: 'Engine run time since the fault codes were last cleared.',
    decode: u16, format: minutes });
  add({ pid: '0121', name: 'Distance Traveled With Check Engine Light On', shortName: 'Dist MIL On', category: 'emissions', unit: 'km', max: 65535,
    formula: '(byte A × 256) + byte B', description: 'Distance driven since the check-engine light came on.',
    decode: u16, format: km });
  add({ pid: '014D', name: 'Time Run With Check Engine Light On', shortName: 'Time MIL On', category: 'emissions', unit: 'min', max: 65535,
    formula: '(byte A × 256) + byte B', description: 'Engine run time since the check-engine light came on.',
    decode: u16, format: minutes });
  add({ pid: '011F', name: 'Run Time Since Engine Start', shortName: 'Run Time', category: 'engine', unit: 's', max: 65535,
    formula: '(byte A × 256) + byte B', description: 'Seconds since the engine was started.',
    decode: u16, format: (v) => { const n = v as number; return n < 60 ? `${n} s` : `${minutes(Math.floor(n / 60))} ${n % 60} s`; } });

  // ── Vehicle and fuel ──────────────────────────────────────────────────────
  const OBD_STANDARDS: Record<number, string> = {
    1: 'OBD-II (CARB)', 2: 'OBD (EPA)', 3: 'OBD and OBD-II', 4: 'OBD-I', 5: 'Not OBD compliant', 6: 'EOBD (Europe)',
    7: 'EOBD and OBD-II', 8: 'EOBD and OBD', 9: 'EOBD, OBD and OBD-II', 10: 'JOBD (Japan)', 11: 'JOBD and OBD-II',
    12: 'JOBD and EOBD', 13: 'JOBD, EOBD and OBD-II', 17: 'Engine Manufacturer Diagnostics (EMD)', 18: 'EMD+',
    19: 'Heavy Duty OBD (Child/Partial)', 20: 'Heavy Duty OBD', 21: 'World Wide Harmonized OBD', 23: 'Heavy Duty EOBD Stage I without NOx control',
    24: 'Heavy Duty EOBD Stage I with NOx control', 25: 'Heavy Duty EOBD Stage II without NOx control', 26: 'Heavy Duty EOBD Stage II with NOx control',
    28: 'Brazil OBD Phase 1', 29: 'Brazil OBD Phase 2', 30: 'Korean OBD', 31: 'India OBD I', 32: 'India OBD II', 33: 'Heavy Duty EOBD Stage VI',
  };
  add({ pid: '011C', name: 'OBD Standard This Vehicle Conforms To', shortName: 'OBD Std', category: 'emissions', unit: '', max: 255,
    formula: 'byte A (enumerated)', description: 'Which on-board diagnostics standard the engine computer was certified to.',
    decode: (b) => b[0], format: (v) => OBD_STANDARDS[v as number] ?? `Type ${v}` });
  const FUEL_TYPES = ['Not available', 'Gasoline', 'Methanol', 'Ethanol', 'Diesel', 'LPG', 'CNG', 'Propane', 'Electric',
    'Bifuel: gasoline', 'Bifuel: methanol', 'Bifuel: ethanol', 'Bifuel: LPG', 'Bifuel: CNG', 'Bifuel: propane', 'Bifuel: electricity',
    'Bifuel: electric and combustion', 'Hybrid gasoline', 'Hybrid ethanol', 'Hybrid diesel', 'Hybrid electric',
    'Hybrid: electric and combustion', 'Hybrid regenerative', 'Bifuel: diesel'];
  add({ pid: '0151', name: 'Fuel Type', shortName: 'Fuel Type', category: 'fuel', unit: '', max: 255,
    formula: 'byte A (enumerated)', description: 'The fuel the engine is set up to run on.',
    decode: (b) => b[0], format: (v) => FUEL_TYPES[v as number] ?? `Type ${v}` });
  add({ pid: '0152', name: 'Ethanol Fuel Percentage', shortName: 'Ethanol', category: 'fuel', unit: '%',
    formula: '(byte A ÷ 255) × 100', description: 'Ethanol content of the fuel as measured by a flex-fuel sensor.',
    decode: pct1, format: (v) => `${v}%` });
  add({ pid: '010A', name: 'Fuel Pressure (Gauge)', shortName: 'Fuel Press', category: 'fuel', unit: 'psi', max: 111,
    formula: '3 × byte A kPa', description: 'Fuel pressure above atmospheric, on engines that report it.',
    decode: (b) => kpaToPsi(3 * b[0]), format: (v) => `${v} psi` });
  add({ pid: '0122', name: 'Fuel Rail Pressure (Relative to Manifold Vacuum)', shortName: 'Rail Rel', category: 'fuel', unit: 'psi', max: 750,
    formula: '0.079 × ((A × 256) + B) kPa', description: 'Fuel rail pressure relative to intake manifold vacuum.',
    decode: (b) => kpaToPsi(0.079 * u16(b)), format: (v) => `${v} psi` });
  add({ pid: '0159', name: 'Fuel Rail Absolute Pressure', shortName: 'Rail Abs', category: 'fuel', unit: 'psi', max: 95052,
    formula: '10 × ((A × 256) + B) kPa', description: 'Absolute fuel rail pressure, mostly reported by direct-injection and diesel engines.',
    decode: (b) => kpaToPsi(10 * u16(b)), format: (v) => `${v} psi` });
  add({ pid: '0144', name: 'Commanded Air-Fuel Equivalence Ratio (Lambda)', shortName: 'Cmd λ', category: 'fuel', unit: 'λ', max: 2,
    formula: '(2 ÷ 65536) × ((A × 256) + B)', description: 'Air-fuel ratio the engine computer is aiming for, as lambda. 1.00 is stoichiometric; below 1 is rich.',
    decode: lambda, format: (v) => `λ ${v}` });

  // ── Evaporative system ────────────────────────────────────────────────────
  add({ pid: '0132', name: 'Evaporative System Vapor Pressure', shortName: 'EVAP Press', category: 'emissions', unit: 'Pa', min: -8192, max: 8192,
    formula: 'signed((A × 256) + B) ÷ 4', description: 'Fuel tank vapor pressure used by the evaporative leak test.',
    decode: (b) => s16(b) / 4, format: (v) => `${v} Pa` });
  add({ pid: '0153', name: 'Absolute Evaporative System Vapor Pressure', shortName: 'EVAP Abs', category: 'emissions', unit: 'kPa', max: 328,
    formula: '((A × 256) + B) ÷ 200', description: 'Absolute fuel tank vapor pressure.',
    decode: (b) => parseFloat((u16(b) / 200).toFixed(2)), format: (v) => `${v} kPa` });
  add({ pid: '0154', name: 'Evaporative System Vapor Pressure (Wide Range)', shortName: 'EVAP Wide', category: 'emissions', unit: 'Pa', min: -32767, max: 32768,
    formula: '((A × 256) + B) − 32767', description: 'Fuel tank vapor pressure over a wider range than PID 32.',
    decode: (b) => u16(b) - 32767, format: (v) => `${v} Pa` });

  // ── Secondary air and auxiliary input ─────────────────────────────────────
  const AIR: Record<number, string> = { 1: 'Upstream of catalyst', 2: 'Downstream of catalyst', 4: 'From outside atmosphere or off', 8: 'Pump on for diagnostics' };
  add({ pid: '0112', name: 'Commanded Secondary Air Status', shortName: 'Sec Air', category: 'emissions', unit: '', max: 255,
    formula: 'byte A (one bit set)', description: 'Where the secondary air injection pump is sending air, on engines that have one.',
    decode: (b) => b[0], format: (v) => AIR[v as number] ?? `Status ${v}` });
  add({ pid: '011E', name: 'Auxiliary Input Status (Power Take-Off)', shortName: 'PTO', category: 'engine', unit: '', max: 1,
    formula: 'bit 0 of byte A', description: 'Whether power take-off is engaged.',
    decode: (b) => b[0] & 1, format: (v) => (v ? 'PTO active' : 'PTO off') });

  // ── Throttle and pedal ────────────────────────────────────────────────────
  for (const [pid, name, short] of [
    ['0148', 'Absolute Throttle Position C', 'Throttle C'],
    ['0149', 'Accelerator Pedal Position D', 'Pedal D'],
    ['014A', 'Accelerator Pedal Position E', 'Pedal E'],
    ['014B', 'Accelerator Pedal Position F', 'Pedal F'],
    ['014C', 'Commanded Throttle Actuator', 'Throttle Cmd'],
    ['015A', 'Relative Accelerator Pedal Position', 'Pedal Rel'],
  ] as const) {
    add({ pid, name, shortName: short, category: 'engine', unit: '%', formula: '(byte A ÷ 255) × 100',
      description: 'Position reported by drive-by-wire throttle and pedal sensors.', decode: pct1, format: (v) => `${v}%` });
  }
  add({ pid: '015B', name: 'Hybrid Battery Pack Remaining Life', shortName: 'Hybrid Batt', category: 'electrical', unit: '%',
    formula: '(byte A ÷ 255) × 100', description: 'State of charge of the hybrid battery pack.',
    decode: pct1, format: (v) => `${v}%` });

  // ── Oxygen sensors: narrowband sensors 3 and 4 ────────────────────────────
  for (const [pid, where] of [['0116', 'Bank 1 Sensor 3'], ['0117', 'Bank 1 Sensor 4'], ['011A', 'Bank 2 Sensor 3'], ['011B', 'Bank 2 Sensor 4']] as const) {
    add({ pid, name: `Oxygen Sensor Voltage — ${where}`, shortName: `O2 ${where.replace('Bank ', 'B').replace(' Sensor ', 'S')}`,
      category: 'oxygen_sensors', unit: 'V', max: 1.275, formula: 'byte A ÷ 200',
      description: 'Narrowband oxygen sensor voltage. Switching between about 0.1 V and 0.9 V is normal for an upstream sensor.',
      decode: o2v, format: (v) => `${v} V` });
  }

  // ── Oxygen sensors: wideband (lambda) ─────────────────────────────────────
  const WIDEBAND = ['Bank 1 Sensor 1', 'Bank 1 Sensor 2', 'Bank 1 Sensor 3', 'Bank 1 Sensor 4', 'Bank 2 Sensor 1', 'Bank 2 Sensor 2', 'Bank 2 Sensor 3', 'Bank 2 Sensor 4'];
  WIDEBAND.forEach((where, i) => {
    const short = `λ ${where.replace('Bank ', 'B').replace(' Sensor ', 'S')}`;
    add({ pid: `01${(0x24 + i).toString(16).toUpperCase()}`, name: `Wideband Oxygen Sensor Lambda (Voltage Type) — ${where}`, shortName: short,
      category: 'oxygen_sensors', unit: 'λ', max: 2, formula: '(2 ÷ 65536) × ((A × 256) + B); C, D = sensor voltage',
      description: 'Air-fuel equivalence ratio measured by a wideband sensor. 1.00 is stoichiometric; below 1 is rich. Sensor numbering assumes the two-bank layout.',
      decode: lambda, format: (v) => `λ ${v}` });
    add({ pid: `01${(0x34 + i).toString(16).toUpperCase()}`, name: `Wideband Oxygen Sensor Lambda (Current Type) — ${where}`, shortName: short,
      category: 'oxygen_sensors', unit: 'λ', max: 2, formula: '(2 ÷ 65536) × ((A × 256) + B); C, D = sensor current',
      description: 'Air-fuel equivalence ratio measured by a wideband sensor. 1.00 is stoichiometric; below 1 is rich. Sensor numbering assumes the two-bank layout.',
      decode: lambda, format: (v) => `λ ${v}` });
  });

  // ── Secondary oxygen sensor fuel trims ────────────────────────────────────
  for (const [pid, name, short] of [
    ['0155', 'Short-Term Secondary O2 Sensor Trim — Bank 1', 'STFT2 B1'],
    ['0156', 'Long-Term Secondary O2 Sensor Trim — Bank 1', 'LTFT2 B1'],
    ['0157', 'Short-Term Secondary O2 Sensor Trim — Bank 2', 'STFT2 B2'],
    ['0158', 'Long-Term Secondary O2 Sensor Trim — Bank 2', 'LTFT2 B2'],
  ] as const) {
    add({ pid, name, shortName: short, category: 'fuel', unit: '%', min: -100, max: 99.2,
      formula: '((byte A − 128) ÷ 128) × 100 (byte B = bank 3 or 4)',
      description: 'Fuel trim correction from the downstream oxygen sensor.', decode: trim, format: (v) => signedPct(v as number) });
  }

  // ── Catalyst temperatures ─────────────────────────────────────────────────
  for (const [pid, where] of [['013C', 'Bank 1 Sensor 1'], ['013D', 'Bank 2 Sensor 1'], ['013E', 'Bank 1 Sensor 2'], ['013F', 'Bank 2 Sensor 2']] as const) {
    add({ pid, name: `Catalyst Temperature — ${where}`, shortName: `Cat ${where.replace('Bank ', 'B').replace(' Sensor ', 'S')}`,
      category: 'temperature', unit: '°F', min: -40, max: 11796, formula: '((A × 256) + B) ÷ 10 − 40 °C',
      description: 'Catalytic converter temperature, measured or modelled by the engine computer.',
      decode: catF, format: (v) => `${v} °F`, warnHigh: 1600 });
  }

  return out;
}

// ─── Lookup by PID string ──────────────────────────────────────────────────────

export const PID_MAP: Map<string, PIDDefinition> = new Map(
  PID_CATALOG.map((p) => [p.pid, p])
);

// ─── Default polling priority queue ───────────────────────────────────────────
// The loop has no time base: fast PIDs are read every cycle, normal every 3rd
// cycle and slow every 10th (see OBDProtocolManager.runPollLoop).

export const POLLING_FAST   = ['010C', '0142'];  // battery voltage (ATRV) is polled separately every cycle
export const POLLING_NORMAL = ['010D', '0105', '0104', '0111', '010F', '0110', '010B', '0106', '0107', '0108', '0109', '0114', '0115', '0118', '0119'];
export const POLLING_SLOW   = ['012F', '015C', '0123', '015E', '0133', '010E', '0143', '0146', '012C', '012D', '012E', '01A4', '0103', '0101'];

// Every other catalog PID. Polled a few at a time on slow cycles, and only when
// PID discovery confirmed the ECU supports it, so unsupported ones cost nothing.
export const POLLING_EXTENDED = PID_CATALOG.map(p => p.pid)
  .filter(pid => ![...POLLING_FAST, ...POLLING_NORMAL, ...POLLING_SLOW].includes(pid));
