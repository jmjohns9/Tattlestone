import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { ScrollPane, SectionHeader, Card, Badge, AlertBanner, Button, DataRow } from '../components/layout/UIComponents';
import { TYPE, NUMERIC } from '../theme/theme';
import { PcmField, PcmFieldGroup, PcmIdentity, VehicleInfo } from '../../shared/types';

// ─── PCM diagnostics ──────────────────────────────────────────────────────────
//
// Reads the GM Mode 3C identity blocks off the powertrain control module.
// Read-only by design: the reference implementation (PcmHammer) exists to
// flash PCMs, and none of that belongs behind a diagnostics tab.

const GROUP_ORDER: PcmFieldGroup[] = ['identity', 'calibration', 'level', 'service'];

const GROUP_LABEL: Record<PcmFieldGroup, string> = {
  identity:    'Module identity',
  calibration: 'Calibration IDs',
  level:       'Calibration levels',
  service:     'Service data',
};

const GROUP_HINT: Record<PcmFieldGroup, string> = {
  identity:    'Who this module is — matches against the VIN on the door jamb',
  calibration: 'What software it is running. Needed before any tune or reflash',
  level:       'Revision counters for each calibration segment',
  service:     'Oil life and the manufacturer enable counter',
};

function FieldRow({ field }: { field: PcmField }): React.ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const value = field.supported
    ? (showRaw && field.raw ? field.raw : (field.value || '—'))
    : 'Not supported by this calibration';

  return (
    <div className="selectable" title={field.supported && field.raw ? 'Click to toggle raw bytes' : undefined}>
      <DataRow
        name={field.label}
        value={value}
        badge={showRaw && field.supported ? <Badge label="Raw" variant="info" /> : undefined}
        onClick={field.supported && field.raw ? () => setShowRaw(v => !v) : undefined}
      />
    </div>
  );
}

// ─── OBD-II ECU information (Mode 09) — any vehicle ──────────────────────────

// Kept across screen switches
let lastVehicleInfo: VehicleInfo | null = null;

function VehicleInfoSection({ isConnected }: { isConnected: boolean }): React.ReactElement {
  const [info,    setInfo]    = useState<VehicleInfo | null>(lastVehicleInfo);
  const [reading, setReading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const read = async () => {
    setReading(true);
    setError(null);
    try {
      const res = await window.electronAPI.readVehicleInfo();
      if (res.ok) { lastVehicleInfo = res.info; setInfo(res.info); } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  };

  const rows = info ? [
    ...info.ecuNames.map((v, i) => ({ key: `n${i}`, name: info.ecuNames.length > 1 ? `ECU name ${i + 1}` : 'ECU name', value: v })),
    ...info.calibrationIds.map((v, i) => ({ key: `c${i}`, name: `Calibration ID ${i + 1}`, value: v })),
    ...info.cvns.map((v, i) => ({ key: `v${i}`, name: `CVN ${i + 1}`, value: v })),
  ] : [];

  return (
    <>
      <SectionHeader>OBD-II ECU information</SectionHeader>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button icon="ti-download" disabled={!isConnected || reading} onClick={read}>
            {reading ? 'Reading…' : info ? 'Re-read' : 'Read calibration IDs'}
          </Button>
          {info && !reading && (
            <span style={{ ...TYPE.caption, color: 'var(--label-2)' }}>read {new Date(info.readAt).toLocaleTimeString()}</span>
          )}
        </div>
        <p style={{ margin: '8px 0 0', ...TYPE.caption, color: 'var(--label-2)' }}>
          Standard Mode 09 reads that work on any OBD-II vehicle. A calibration verification number (CVN) is a checksum of
          the ECU software: if it differs from the stock CVN for the same calibration ID, the ECU has been reprogrammed or tuned.
        </p>
      </Card>
      {error && <AlertBanner variant="crit" message={error} />}
      {info && (
        <Card padding={0}>
          {rows.length
            ? rows.map(r => <DataRow key={r.key} name={r.name} value={r.value} />)
            : <p style={{ margin: 0, padding: '8px 12px', ...TYPE.body, color: 'var(--label-2)' }}>The vehicle returned no calibration data.</p>}
          {info.notes.map(n => (
            <p key={n} style={{ margin: 0, padding: '4px 12px 8px', ...TYPE.caption, color: 'var(--label-3)' }}>{n}</p>
          ))}
        </Card>
      )}
    </>
  );
}

export function PcmScreen(): React.ReactElement {
  const connectionStatus = useAppStore(s => s.connectionStatus);
  const isConnected = connectionStatus === 'connected';

  const [identity, setIdentity] = useState<PcmIdentity | null>(null);
  const [reading,  setReading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => window.electronAPI.onPcmProgress(setProgress), []);

  const handleRead = async () => {
    setReading(true);
    setError(null);
    setProgress(null);
    try {
      const res = await window.electronAPI.readPcmIds();
      if (res.ok) {
        setIdentity(res.identity);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
      setProgress(null);
    }
  };

  const supported = identity?.fields.filter(f => f.supported).length ?? 0;

  return (
    <ScrollPane>
      {!isConnected && (
        <AlertBanner
          variant="warn"
          message="Not connected. The PCM identity read talks directly to the module, so it needs a live adapter connection."
        />
      )}

      <VehicleInfoSection isConnected={isConnected} />

      <SectionHeader>GM powertrain control module (Mode 3C)</SectionHeader>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            icon="ti-download"
            disabled={!isConnected || reading}
            onClick={handleRead}
          >
            {reading ? 'Reading…' : identity ? 'Re-read identity' : 'Read PCM identity'}
          </Button>

          {reading && progress && (
            <span style={{ ...TYPE.caption, ...NUMERIC, color: 'var(--label-2)' }}>
              block {progress.done} / {progress.total}
            </span>
          )}

          {identity && !reading && (
            <>
              <Badge label={`${supported}/${identity.fields.length} supported`} variant="ok" />
              <span style={{ ...TYPE.caption, color: 'var(--label-2)' }}>
                {identity.protocol} · read {new Date(identity.readAt).toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      </Card>

      <AlertBanner
        variant="info"
        message="Queries GM Mode 3C identity blocks over J1850 VPW. PID polling pauses while this runs, because the read reprograms the adapter header and turns message headers on. Read-only — nothing is written to the module."
      />

      {error && <AlertBanner variant="crit" message={error} />}

      {identity && GROUP_ORDER.map(group => {
        const fields = identity.fields.filter(f => f.group === group);
        if (!fields.length) return null;
        return (
          <React.Fragment key={group}>
            <SectionHeader>{GROUP_LABEL[group]}</SectionHeader>
            <Card padding={0}>
              <p style={{ margin: 0, padding: '8px 12px 4px', ...TYPE.caption, color: 'var(--label-2)' }}>
                {GROUP_HINT[group]}
              </p>
              {fields.map(f => <FieldRow key={f.key} field={f} />)}
            </Card>
          </React.Fragment>
        );
      })}

      {!identity && !error && (
        <Card>
          <p style={{ margin: 0, ...TYPE.caption, color: 'var(--label-2)', lineHeight: '18px' }}>
            Reads VIN, serial number, hardware ID, operating system ID, every calibration
            segment ID and its revision level, the broadcast code, oil life, and the
            manufacturer enable counter.
            <br /><br />
            Blocks the module does not answer are shown as unsupported rather than hidden —
            which IDs a PCM exposes varies by calibration, and the gaps are themselves
            diagnostic. Click any value to see the raw bytes behind it.
          </p>
        </Card>
      )}
    </ScrollPane>
  );
}
