const test = require('node:test');
const assert = require('node:assert/strict');

require('../crm-data.js');
const crm = globalThis.AVACRM;

test('legacy records receive stable client, policy and benefit ids', () => {
  const client = crm.normalizeClient({ id: 'legacy-1', owner: 'Ivan', policies: [{ items: [{ category: '危疾' }] }] }, 0);
  assert.equal(client.clientId, 'legacy-1');
  assert.match(client.policies[0].policyId, /^policy_/);
  assert.match(client.policies[0].items[0].benefitId, /^benefit_/);
});

test('coverage aggregation separates CI, life, medical and policy values', () => {
  const client = crm.normalizeClient({ owner: 'Test', policies: [{ insurer: 'AIA', items: [
    { category: '危疾', sumAssured: '500,000', saCurrency: 'HKD', cvGuaranteed: '10,000', cvAnnualBonus: '2,000', cvCurrency: 'HKD' },
    { category: '人壽', sumAssured: '100,000', saCurrency: 'USD' },
    { category: '醫療', sumAssured: 0 }
  ] }] }, 0);
  const total = crm.aggregateCoverage(client);
  assert.equal(total.ci, 500000);
  assert.equal(total.life, 780000);
  assert.equal(total.medical, 1);
  assert.equal(total.guaranteed, 10000);
  assert.equal(total.nonGuaranteed, 2000);
});

test('user flow overrides cloud which overrides built-in fallback', () => {
  const result = crm.resolveFlow(
    [{ step_id: 'a', title: 'fallback', enabled: true, sort_order: 0 }],
    [{ step_id: 'a', title: 'cloud' }],
    [{ step_id: 'a', title: 'user', enabled: true }]
  );
  assert.equal(result[0].title, 'user');
  assert.equal(result[0].source, 'user');
});

test('multi-file extraction groups matching policy and flags conflicts', () => {
  const groups = crm.groupExtractionResults([
    { fileRef: { id: '1', name: 'p1.jpg' }, data: { policyNumber: 'P1', insuredPerson: 'A', productName: 'Plan', insurer: 'AIA' } },
    { fileRef: { id: '2', name: 'p2.jpg' }, data: { policyNumber: 'P1', insuredPerson: 'A', productName: 'Plan', insurer: 'Other' } },
    { fileRef: { id: '3', name: 'unknown.jpg' }, data: {} }
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].files.length, 2);
  assert.equal(groups[0].status, 'needs_confirmation');
  assert.equal(groups[1].status, 'needs_confirmation');
});

test('backup validation rejects unrelated JSON and accepts AVA backup', () => {
  assert.throws(() => crm.validateBackup({}), /有效/);
  const payload = crm.validateBackup({ format: 'AVA-CRM-Backup', backupVersion: 1, data: {} });
  assert.ok(Array.isArray(payload.data.Clients));
  assert.equal(payload.data.ClientShares, undefined);
});
