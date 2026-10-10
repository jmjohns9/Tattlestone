import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportedCodes, filterBulletins, mentionsAny } from './safety';
import type { NhtsaBulletin } from '../../shared/types';

const b = (number: string, summary: string, codes: string[] = [], components = ['ENGINE']): NhtsaBulletin =>
  ({ id: number.length, number, date: '2020-01-01', components, summary, codes });

const LIST = [
  b('PIT1', 'Misfire at idle', ['P0300']),
  b('PIT2', 'Radio static', [], ['ELECTRICAL SYSTEM']),
  b('TSB3', 'Lean condition and misfire', ['P0171', 'P0300']),
];

test('reported codes are unique, upper case and sorted', () => {
  assert.deepEqual(reportedCodes([{ code: 'p0300' }, { code: 'B1982' }, { code: 'P0300' }]), ['B1982', 'P0300']);
});

test('search needs every word, across number, summary, component and codes', () => {
  assert.deepEqual(filterBulletins(LIST, 'misfire lean', null).map(x => x.number), ['TSB3']);
  assert.deepEqual(filterBulletins(LIST, 'electrical', null).map(x => x.number), ['PIT2']);
  assert.deepEqual(filterBulletins(LIST, 'p0171', null).map(x => x.number), ['TSB3']);
  assert.equal(filterBulletins(LIST, '  ', null).length, 3);
});

test('the code filter keeps only bulletins that mention a reported code', () => {
  assert.deepEqual(filterBulletins(LIST, '', ['P0171']).map(x => x.number), ['TSB3']);
  assert.deepEqual(filterBulletins(LIST, '', []).map(x => x.number), []);
  assert.ok(mentionsAny(LIST[0], ['P0300']));
  assert.ok(!mentionsAny(LIST[1], ['P0300']));
});
