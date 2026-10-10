import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore, vehicleDisplayName } from '../store/appStore';
import { VehicleSafetyReport, NhtsaRecall, NhtsaBulletin, NhtsaComplaint } from '../../shared/types';
import {
  ScrollPane, SectionHeader, Card, Grid, Badge, AlertBanner, Button, Divider, EmptyState, SegmentedControl,
} from '../components/layout/UIComponents';
import { TYPE, NUMERIC, WEIGHT } from '../theme/theme';
import { reportedCodes, filterBulletins, mentionsAny } from '../logic/safety';

// Kept across screen switches; main caches the NHTSA answers for 30 minutes too
let lastReport: VehicleSafetyReport | null = null;

const BULLETIN_PAGE = 100;

const fmtDate = (iso: string): string =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const sentence = (s: string): string => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

// ─── Rows ─────────────────────────────────────────────────────────────────────

function RecallRow({ r }: { r: NhtsaRecall }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} className={open ? undefined : 'row-hover'}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer', background: open ? 'var(--fill)' : 'transparent' }}>
        <span style={{ ...TYPE.body, ...NUMERIC, fontWeight: WEIGHT.medium, color: 'var(--label)', width: 90, flexShrink: 0 }}>{r.campaign}</span>
        <span style={{ ...TYPE.body, color: 'var(--label)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sentence(r.component)}</span>
        {/* 'E' campaigns cover aftermarket equipment sold for the vehicle, not the vehicle itself */}
        {r.campaign[2] === 'E' && <Badge label="Aftermarket part" variant="muted" />}
        <span style={{ ...TYPE.caption, color: 'var(--label-3)', flexShrink: 0 }}>{r.manufacturer}</span>
        <span style={{ ...TYPE.caption, ...NUMERIC, color: 'var(--label-3)', width: 90, textAlign: 'right', flexShrink: 0 }}>{fmtDate(r.reportDate)}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 13, color: 'var(--label-3)', flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ background: 'var(--fill)', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([['Summary', r.summary], ['Consequence', r.consequence], ['Remedy', r.remedy]] as const).filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <div style={{ ...TYPE.caption, color: 'var(--label-3)', marginBottom: 2 }}>{k}</div>
              <div style={{ ...TYPE.body, color: 'var(--label)' }}>{sentence(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletinRow({ b, codes }: { b: NhtsaBulletin; codes: string[] }): React.ReactElement {
  const [state, setState] = useState<'idle' | 'opening' | 'missing'>('idle');
  const open = async () => {
    setState('opening');
    const ok = await window.electronAPI.openBulletin(b.id).catch(() => false);
    setState(ok ? 'idle' : 'missing');
  };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 12px' }}>
      <div style={{ width: 90, flexShrink: 0 }}>
        <div style={{ ...TYPE.body, ...NUMERIC, fontWeight: WEIGHT.medium, color: 'var(--label)' }}>{b.number || '—'}</div>
        <div style={{ ...TYPE.caption, ...NUMERIC, color: 'var(--label-3)' }}>{fmtDate(b.date)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.body, color: 'var(--label)' }}>{b.summary || 'No summary filed'}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {b.components.map(c => <Badge key={c} label={sentence(c)} variant="muted" />)}
          {b.codes.map(c => <Badge key={c} label={c} variant={codes.includes(c) ? 'crit' : 'info'} />)}
        </div>
        {state === 'missing' && (
          <div style={{ ...TYPE.caption, color: 'var(--warn-text)', marginTop: 4 }}>NHTSA has no document for this bulletin.</div>
        )}
      </div>
      <Button size="sm" variant="plain" icon="ti-file-type-pdf" disabled={state === 'opening'} onClick={open} title="Open the bulletin PDF from NHTSA">
        {state === 'opening' ? 'Opening…' : 'PDF'}
      </Button>
    </div>
  );
}

function ComplaintRow({ c }: { c: NhtsaComplaint }): React.ReactElement {
  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ ...TYPE.caption, ...NUMERIC, color: 'var(--label-3)' }}>{fmtDate(c.date)}</span>
        {c.components.map(x => <Badge key={x} label={sentence(x)} variant="muted" />)}
        {c.crash && <Badge label="Crash" variant="crit" />}
        {c.fire && <Badge label="Fire" variant="crit" />}
      </div>
      <div style={{ ...TYPE.body, color: 'var(--label)' }}>{c.summary}</div>
    </div>
  );
}

const Rows = ({ children }: { children: React.ReactNode[] }): React.ReactElement => (
  <Card padding={0}>
    {children.map((child, i) => <React.Fragment key={i}>{i > 0 && <Divider />}{child}</React.Fragment>)}
  </Card>
);

function Stat({ label, value, note }: { label: string; value: string; note?: string }): React.ReactElement {
  return (
    <Card>
      <div style={{ ...TYPE.caption, color: 'var(--label-3)' }}>{label}</div>
      <div style={{ ...TYPE.title2, ...NUMERIC, color: 'var(--label)' }}>{value}</div>
      {note && <div style={{ ...TYPE.caption, color: 'var(--label-2)' }}>{note}</div>}
    </Card>
  );
}

const SectionError = ({ what, error }: { what: string; error: string }): React.ReactElement =>
  <AlertBanner variant="warn" message={`Couldn't load ${what} from NHTSA: ${error}`} />;

// ─── Screen ───────────────────────────────────────────────────────────────────

export function RecallsScreen(): React.ReactElement {
  const vehicle         = useAppStore(s => s.vehicle);
  const dtcs            = useAppStore(s => s.dtcs);
  const setActiveScreen = useAppStore(s => s.setActiveScreen);
  const codes = useMemo(() => reportedCodes(dtcs), [dtcs]);

  const ymm = { year: vehicle.year.trim(), make: vehicle.make.trim(), model: vehicle.model.trim() };
  const complete = /^\d{4}$/.test(ymm.year) && !!ymm.make && !!ymm.model;
  const sameVehicle = (r: VehicleSafetyReport | null) =>
    !!r && r.year === ymm.year && r.make.toLowerCase() === ymm.make.toLowerCase();

  const [report,  setReport]  = useState<VehicleSafetyReport | null>(() => (sameVehicle(lastReport) ? lastReport : null));
  const [loading, setLoading] = useState(false);
  const [failed,  setFailed]  = useState(false);
  const [query,   setQuery]   = useState('');
  const [scope,   setScope]   = useState<'all' | 'codes'>('all');
  const [shown,   setShown]   = useState(BULLETIN_PAGE);

  const load = async (refresh = false) => {
    if (!complete) return;
    setLoading(true);
    setFailed(false);
    try {
      const r = await window.electronAPI.vehicleSafety(ymm, codes, refresh);
      lastReport = r;
      setReport(r);
      setFailed(!r);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Load on open and whenever the vehicle or its codes change
  useEffect(() => { void load(); }, [complete, ymm.year, ymm.make, ymm.model, codes.join(',')]);

  const bulletins = report?.bulletins.ok ? report.bulletins.data : [];
  const filtered  = useMemo(
    () => filterBulletins(bulletins, query, scope === 'codes' ? codes : null),
    [bulletins, query, scope, codes]);
  const codeBulletins = useMemo(() => bulletins.filter(b => mentionsAny(b, codes)), [bulletins, codes]);
  useEffect(() => setShown(BULLETIN_PAGE), [query, scope]);

  if (!complete) {
    return (
      <ScrollPane>
        <Card>
          <EmptyState icon="ti-file-alert" title="No vehicle set"
            message="Recalls and bulletins are looked up by year, make and model. Connect to read the VIN, or enter the vehicle on the Connection screen." />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Button onClick={() => setActiveScreen('connect')}>Open Connection</Button>
          </div>
        </Card>
      </ScrollPane>
    );
  }

  const recalls    = report?.recalls;
  const complaints = report?.complaints;
  const modelNote  = report && report.model.toLowerCase() !== ymm.model.toLowerCase()
    ? `NHTSA lists this vehicle as "${report.model}".` : undefined;

  return (
    <ScrollPane>
      <SectionHeader action={
        <Button size="sm" icon="ti-refresh" disabled={loading} onClick={() => load(true)}>{loading ? 'Loading…' : 'Refresh'}</Button>
      }>
        {`NHTSA records for ${vehicleDisplayName(vehicle)}`}
      </SectionHeader>

      {failed && <AlertBanner variant="warn" message="Couldn't reach NHTSA. Check the network and try again." action="Retry" onAction={() => load(true)} />}
      {!report && loading && <Card><EmptyState icon="ti-loader-2" title="Loading from NHTSA…" /></Card>}

      {report && (
        <>
          <Grid cols={4}>
            <Stat label="Recalls" value={recalls?.ok ? String(recalls.data.length) : '—'} note={modelNote} />
            <Stat label="Bulletins" value={report.bulletins.ok ? String(bulletins.length) : '—'} />
            <Stat label="Bulletins citing your codes" value={report.bulletins.ok ? String(codeBulletins.length) : '—'}
              note={codes.length ? codes.join(', ') : 'No codes read yet'} />
            <Stat label="Owner complaints" value={complaints?.ok ? complaints.data.total.toLocaleString() : '—'} />
          </Grid>

          {codeBulletins.length > 0 && (
            <AlertBanner variant="warn"
              message={`${codeBulletins.length} manufacturer bulletin${codeBulletins.length === 1 ? '' : 's'} mention a code this vehicle reported.`}
              action="Show them" onAction={() => { setScope('codes'); setQuery(''); }} />
          )}

          {/* ── Recalls ─────────────────────────────────────────────────── */}
          <SectionHeader>Safety recalls</SectionHeader>
          {recalls && !recalls.ok && <SectionError what="recalls" error={recalls.error} />}
          {recalls?.ok && (recalls.data.length
            ? <Rows>{recalls.data.map(r => <RecallRow key={r.campaign} r={r} />)}</Rows>
            : <Card><EmptyState icon="ti-circle-check" title="No recalls on file" message="Check the VIN at nhtsa.gov/recalls for open recalls on this exact vehicle." /></Card>)}

          {/* ── Bulletins ───────────────────────────────────────────────── */}
          <SectionHeader action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="text" placeholder="Search bulletins…" value={query} onChange={e => setQuery(e.target.value)} style={{ width: 200, height: 28 }} />
              <SegmentedControl size="sm" ariaLabel="Bulletin scope" value={scope} onChange={setScope}
                options={[{ value: 'all', label: 'All' }, { value: 'codes', label: 'Your codes' }]} />
            </div>
          }>
            {`Manufacturer bulletins${report.bulletins.ok ? ` — ${filtered.length}` : ''}`}
          </SectionHeader>
          {!report.bulletins.ok && <SectionError what="bulletins" error={report.bulletins.error} />}
          {report.bulletins.ok && (filtered.length
            ? <Rows>{filtered.slice(0, shown).map(b => <BulletinRow key={b.id} b={b} codes={codes} />)}</Rows>
            : <Card><EmptyState icon="ti-files-off" title="No matching bulletins"
                message={scope === 'codes' && !codes.length ? 'Read fault codes first, then this shows bulletins that cite them.' : undefined} /></Card>)}
          {report.bulletins.ok && filtered.length > shown && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button size="sm" onClick={() => setShown(n => n + BULLETIN_PAGE)}>{`Show more (${filtered.length - shown} left)`}</Button>
            </div>
          )}

          {/* ── Complaints ──────────────────────────────────────────────── */}
          <SectionHeader>Owner complaints</SectionHeader>
          {complaints && !complaints.ok && <SectionError what="complaints" error={complaints.error} />}
          {complaints?.ok && (complaints.data.total === 0
            ? <Card><EmptyState icon="ti-message-off" title="No complaints on file" /></Card>
            : (
              <>
                <Card>
                  <div style={{ ...TYPE.caption, color: 'var(--label-2)', marginBottom: 8 }}>
                    {`${complaints.data.crashes} crashes · ${complaints.data.fires} fires · ${complaints.data.injuries} injuries · ${complaints.data.deaths} deaths reported`}
                  </div>
                  {complaints.data.byComponent.slice(0, 8).map(({ component, count }) => (
                    <div key={component} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                      <span style={{ ...TYPE.body, color: 'var(--label)', width: 220, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sentence(component)}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--fill)', borderRadius: 3 }}>
                        <div style={{ width: `${(count / complaints.data.byComponent[0].count) * 100}%`, height: '100%', background: 'var(--label-3)', borderRadius: 3 }} />
                      </div>
                      <span style={{ ...TYPE.caption, ...NUMERIC, color: 'var(--label-2)', width: 48, textAlign: 'right' }}>{count}</span>
                    </div>
                  ))}
                </Card>
                {complaints.data.mentioningCodes.length > 0 && (
                  <>
                    <SectionHeader>{`Complaints citing your codes — ${complaints.data.mentioningCodes.length}`}</SectionHeader>
                    <Rows>{complaints.data.mentioningCodes.map(c => <ComplaintRow key={c.id} c={c} />)}</Rows>
                  </>
                )}
                <SectionHeader>Most recent complaints</SectionHeader>
                <Rows>{complaints.data.recent.slice(0, 10).map(c => <ComplaintRow key={c.id} c={c} />)}</Rows>
              </>
            ))}

          <div style={{ ...TYPE.caption, color: 'var(--label-3)' }}>
            {`Source: NHTSA (public domain), fetched ${new Date(report.fetchedAt).toLocaleTimeString()}. NHTSA doesn't hold every service bulletin, and complaints are unverified owner reports.`}
          </div>
        </>
      )}
    </ScrollPane>
  );
}
