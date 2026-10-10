import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupDTC } from './dtcLookup';
import { DTC_CATALOG } from './dtcCatalog.generated';
import { DTC_GENERIC } from './dtcGeneric.generated';
import { toRecord } from './obdexRecord';

test('the curated catalog wins over OBDex', () => {
  assert.ok(DTC_GENERIC.P0300);
  assert.equal(lookupDTC('P0300'), DTC_CATALOG.P0300);
});

test('OBDex fills codes the curated catalog lacks', () => {
  assert.equal(DTC_CATALOG.P2096, undefined);
  const rec = lookupDTC('P2096');
  assert.ok(rec?.description);
  assert.ok(rec?.causes?.length);
});

test('manufacturer-specific codes come only from the curated catalog', () => {
  assert.ok(lookupDTC('B1982'));
  assert.equal(lookupDTC('P1416'), undefined);
});

test('OBDex causes are ordered by likelihood and English only', () => {
  const rec = toRecord({
    code: 'P0001',
    title: { en: 'Fuel Volume Regulator Control Circuit / Open' },
    common_causes: [
      { likelihood: 'low', label: { en: 'Regulator failed' } },
      { likelihood: 'high', label: { en: 'Open circuit' } },
    ],
    symptoms: [{ en: 'Check engine light on' }],
    repair: { difficulty: 'medium', diy_possible: false, estimated_hours: [1, 2] },
  });
  assert.deepEqual(rec?.causes, ['Open circuit', 'Regulator failed']);
  assert.match(rec!.repair!, /medium difficulty, about 1–2 h, usually a shop job/);
  assert.match(rec!.repair!, /Symptoms: Check engine light on\./);
});

test('OBDex entries without English text are skipped', () => {
  assert.equal(toRecord({ code: 'P0001', title: {} }), null);
});
