import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codesIn, foundAnything, isoDate, parseRecalls, parseBulletins, parseComplaints, summarizeComplaints, validVehicle } from './nhtsa';

// Shapes copied from live api.nhtsa.gov responses (2004 Chevrolet Silverado)
const RECALLS = { Count: 2, results: [
  { Manufacturer: 'K2 MOTOR CORPORATION', NHTSACampaignNumber: '08E050000', ReportReceivedDate: '11/08/2008',
    Component: 'EXTERIOR LIGHTING:HEADLIGHTS', Summary: 'MISSING AMBER REFLECTOR', Consequence: 'REDUCED VISIBILITY', Remedy: 'REFUND' },
  { Manufacturer: 'General Motors LLC', NHTSACampaignNumber: '04V123000', ReportReceivedDate: '02/03/2004',
    Component: 'STEERING', Summary: 'S', Consequence: 'C', Remedy: 'R' },
  { NHTSACampaignNumber: '08E050000', Summary: 'duplicate' },
] };

const BULLETINS = { results: [{ safetyIssues: { manufacturerCommunications: [
  { manufacturerCommunicationNumber: 'PIP5601C', nhtsaIdNumber: 11020816, subject: null,
    summary: 'Misfire P0300 with P0171 after cold start', communicationDate: '2025-07-18T15:10:37Z',
    components: [{ id: 192, name: 'POWER TRAIN' }] },
  { manufacturerCommunicationNumber: 'OLD1', nhtsaIdNumber: 100, summary: null, subject: 'No summary', communicationDate: null, components: [] },
] } }, { safetyIssues: { manufacturerCommunications: [
  { manufacturerCommunicationNumber: 'PIP5601C', nhtsaIdNumber: 11020816, summary: 'duplicate from another trim' },
] } }] };

const COMPLAINTS = { results: [
  { odiNumber: 1, crash: false, fire: true, numberOfInjuries: 1, numberOfDeaths: 0, dateComplaintFiled: '06/05/2026',
    components: 'POWER TRAIN,ENGINE', summary: 'Limp mode with P0700 set.' },
  { odiNumber: 2, crash: true, fire: false, numberOfInjuries: 0, numberOfDeaths: 0, dateComplaintFiled: '01/15/2020',
    components: 'ENGINE', summary: 'Stalled.' },
] };

test('codes are found once, in upper case, and not inside longer words', () => {
  assert.deepEqual(codesIn('p0300 then P0300 and P0171; XP0420Y'), ['P0300', 'P0171']);
});

test('dates: recalls are day-first, complaints month-first, ISO passes through', () => {
  assert.equal(isoDate('11/08/2008', 'dmy'), '2008-08-11');
  assert.equal(isoDate('06/05/2026', 'mdy'), '2026-06-05');
  assert.equal(isoDate('2025-07-18T15:10:37Z', 'mdy'), '2025-07-18');
  assert.equal(isoDate(null, 'mdy'), '');
});

test('recalls are de-duplicated and newest first', () => {
  const r = parseRecalls(RECALLS);
  assert.deepEqual(r.map(x => x.campaign), ['08E050000', '04V123000']);
  assert.equal(r[0].reportDate, '2008-08-11');
  assert.equal(r[0].remedy, 'REFUND');
});

test('bulletins merge trims, fall back to the subject, and list their codes', () => {
  const b = parseBulletins(BULLETINS);
  assert.equal(b.length, 2);
  assert.deepEqual(b[0], {
    id: 11020816, number: 'PIP5601C', date: '2025-07-18', components: ['POWER TRAIN'],
    summary: 'Misfire P0300 with P0171 after cold start', codes: ['P0300', 'P0171'],
  });
  assert.equal(b[1].summary, 'No summary');
});

test('complaints are summarized by component and matched to codes', () => {
  const s = summarizeComplaints(parseComplaints(COMPLAINTS), ['p0700']);
  assert.equal(s.total, 2);
  assert.deepEqual([s.crashes, s.fires, s.injuries, s.deaths], [1, 1, 1, 0]);
  assert.deepEqual(s.byComponent, [{ component: 'ENGINE', count: 2 }, { component: 'POWER TRAIN', count: 1 }]);
  assert.deepEqual(s.mentioningCodes.map(c => c.id), [1]);
  assert.deepEqual(s.recent.map(c => c.id), [1, 2]);
  assert.equal('injuries' in s.recent[0], false);
});

test('malformed responses parse to empty lists', () => {
  assert.deepEqual(parseRecalls(null), []);
  assert.deepEqual(parseBulletins({ results: 'x' }), []);
  assert.deepEqual(parseComplaints({}), []);
});

test('vehicle input is validated before any request', () => {
  assert.ok(validVehicle({ year: '2004', make: 'Chevrolet', model: 'Silverado' }));
  assert.ok(!validVehicle({ year: '04', make: 'Chevrolet', model: 'Silverado' }));
  assert.ok(!validVehicle({ year: '2004', make: '', model: 'Silverado' }));
  assert.ok(!validVehicle({ year: 2004, make: 'Chevrolet', model: 'Silverado' }));
});

test('a model NHTSA rejects counts as nothing found, so the base model is tried', () => {
  const rejected = { ok: false as const, error: 'NHTSA HTTP 400' };
  assert.ok(!foundAnything({ recalls: rejected, bulletins: { ok: true, data: [] }, complaints: rejected }));
  assert.ok(foundAnything({ recalls: { ok: true, data: parseRecalls(RECALLS) }, bulletins: rejected, complaints: rejected }));
});
