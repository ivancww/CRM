(function (root) {
  'use strict';

  const DB_NAME = 'AVA_CRM';
  const DB_VERSION = 2;
  const BACKUP_VERSION = 1;
  const STORES = ['Clients', 'Policies', 'Benefits', 'PolicyValues', 'Reviews', 'ResourceAnswers', 'UserSettings', 'FlowOverrides', 'Metadata', 'ClientShares'];

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const id = prefix => `${prefix}_${Date.now().toString(36)}_${cryptoRandom(12)}`;
  function cryptoRandom(length) {
    const bytes = new Uint8Array(length);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }
  const number = value => Number(String(value == null ? 0 : value).replace(/[^0-9.-]/g, '')) || 0;
  const hkd = (value, currency) => number(value) * (currency === 'USD' ? 7.8 : 1);

  function normalizeBenefit(item, policyId, index) {
    return {
      ...clone(item || {}),
      benefitId: item && item.benefitId || id('benefit'),
      policyId,
      sortOrder: index,
      category: item && item.category || '其他'
    };
  }

  function normalizePolicy(policy, clientId, index) {
    const policyId = policy && policy.policyId || id('policy');
    const sourceItems = policy && Array.isArray(policy.items) ? policy.items : [];
    return {
      ...clone(policy || {}),
      policyId,
      clientId,
      sortOrder: index,
      type: policy && policy.type || sourceItems[0] && sourceItems[0].category || '其他',
      items: sourceItems.map((item, itemIndex) => normalizeBenefit(item, policyId, itemIndex))
    };
  }

  function normalizeClient(client, index) {
    const clientId = client && (client.clientId || client.id) || id('client');
    return {
      ...clone(client || {}),
      id: clientId,
      clientId,
      sortOrder: index,
      owner: client && client.owner || '未命名客戶',
      policies: (client && Array.isArray(client.policies) ? client.policies : []).map((policy, policyIndex) => normalizePolicy(policy, clientId, policyIndex)),
      updatedAt: client && client.updatedAt || new Date().toISOString()
    };
  }

  function normalizeClients(clients) {
    return (Array.isArray(clients) ? clients : []).map(normalizeClient);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB is not available'));
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: keyFor(store) });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'));
    });
  }

  function keyFor(store) {
    return ({
      Clients: 'clientId', Policies: 'policyId', Benefits: 'benefitId', PolicyValues: 'valueId',
      Reviews: 'reviewId', ResourceAnswers: 'answerId', UserSettings: 'settingId',
      FlowOverrides: 'stepId', Metadata: 'key', ClientShares: 'token'
    })[store];
  }

  async function transaction(storeNames, mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = Object.fromEntries(storeNames.map(name => [name, tx.objectStore(name)]));
      let result;
      try { result = callback(stores, tx); } catch (error) { db.close(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB transaction failed')); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB transaction aborted')); };
    });
  }

  const requestValue = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  async function getAll(store) {
    const db = await openDatabase();
    try {
      const tx = db.transaction([store], 'readonly');
      return await requestValue(tx.objectStore(store).getAll());
    } finally { db.close(); }
  }

  async function put(store, value) {
    return transaction([store], 'readwrite', stores => stores[store].put(clone(value)));
  }

  async function remove(store, key) {
    return transaction([store], 'readwrite', stores => stores[store].delete(key));
  }

  async function replaceStore(store, records) {
    return transaction([store], 'readwrite', stores => {
      stores[store].clear();
      records.forEach(record => stores[store].put(clone(record)));
    });
  }

  async function saveClientGraph(client) {
    const normalized = normalizeClient(client, client.sortOrder || 0);
    const policies = normalized.policies;
    const benefits = policies.flatMap(policy => policy.items || []);
    const previousPolicies = (await getAll('Policies')).filter(policy => policy.clientId === normalized.clientId);
    const previousPolicyIds = new Set(previousPolicies.map(policy => policy.policyId));
    const previousBenefits = (await getAll('Benefits')).filter(benefit => previousPolicyIds.has(benefit.policyId));
    const nextPolicyIds = new Set(policies.map(policy => policy.policyId));
    const nextBenefitIds = new Set(benefits.map(benefit => benefit.benefitId));
    const clientRecord = { ...normalized };
    delete clientRecord.policies;
    await transaction(['Clients', 'Policies', 'Benefits', 'Metadata'], 'readwrite', stores => {
      stores.Clients.put(clientRecord);
      previousPolicies.filter(policy => !nextPolicyIds.has(policy.policyId)).forEach(policy => stores.Policies.delete(policy.policyId));
      previousBenefits.filter(benefit => !nextBenefitIds.has(benefit.benefitId)).forEach(benefit => stores.Benefits.delete(benefit.benefitId));
      policies.forEach(policy => {
        const policyRecord = { ...policy };
        delete policyRecord.items;
        stores.Policies.put(policyRecord);
      });
      benefits.forEach(benefit => stores.Benefits.put(benefit));
      stores.Metadata.put({ key: 'lastWrite', value: new Date().toISOString(), schemaVersion: DB_VERSION });
    });
    return normalized;
  }

  async function loadClients() {
    const [clients, policies, benefits] = await Promise.all([getAll('Clients'), getAll('Policies'), getAll('Benefits')]);
    return clients.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(client => ({
      ...client,
      id: client.clientId,
      policies: policies.filter(policy => policy.clientId === client.clientId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(policy => ({ ...policy, items: benefits.filter(item => item.policyId === policy.policyId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) }))
    }));
  }

  async function deleteClient(clientId) {
    const policies = (await getAll('Policies')).filter(policy => policy.clientId === clientId);
    const policyIds = new Set(policies.map(policy => policy.policyId));
    const benefits = (await getAll('Benefits')).filter(item => policyIds.has(item.policyId));
    const reviews = (await getAll('Reviews')).filter(item => item.clientId === clientId);
    const answers = (await getAll('ResourceAnswers')).filter(item => item.clientId === clientId);
    await transaction(['Clients', 'Policies', 'Benefits', 'Reviews', 'ResourceAnswers'], 'readwrite', stores => {
      stores.Clients.delete(clientId);
      policies.forEach(policy => stores.Policies.delete(policy.policyId));
      benefits.forEach(item => stores.Benefits.delete(item.benefitId));
      reviews.forEach(item => stores.Reviews.delete(item.reviewId));
      answers.forEach(item => stores.ResourceAnswers.delete(item.answerId));
    });
  }

  async function migrateLegacy(localStorageRef) {
    const meta = await getAll('Metadata');
    if (meta.some(item => item.key === 'legacyMigration')) return { migrated: false, reason: 'already-migrated' };
    let legacy = [];
    try { legacy = JSON.parse(localStorageRef && localStorageRef.getItem('AVA_CLIENTS_CACHE') || '[]'); } catch (_) { legacy = []; }
    const normalized = normalizeClients(legacy);
    for (const client of normalized) await saveClientGraph(client);
    await put('Metadata', { key: 'legacyMigration', value: new Date().toISOString(), source: 'AVA_CLIENTS_CACHE', count: normalized.length });
    return { migrated: normalized.length > 0, count: normalized.length };
  }

  function aggregateCoverage(client) {
    const result = { ci: 0, life: 0, medical: 0, guaranteed: 0, nonGuaranteed: 0, policyCount: 0, sources: { ci: [], life: [], medical: [], values: [] } };
    (client && client.policies || []).forEach(policy => {
      result.policyCount += 1;
      let policyGuaranteed = 0;
      let policyNonGuaranteed = 0;
      (policy.items || []).forEach(item => {
        const amount = hkd(item.sumAssured, item.saCurrency);
        const category = String(item.category || policy.type || '');
        if (category.includes('危疾') && !category.includes('早期')) { result.ci += amount; result.sources.ci.push(source(policy, item, amount)); }
        if (category.includes('人壽') || category.includes('身故')) { result.life += amount; result.sources.life.push(source(policy, item, amount)); }
        policyGuaranteed += hkd(item.cvGuaranteed, item.cvCurrency);
        policyNonGuaranteed += hkd(number(item.cvAnnualBonus) + number(item.cvCashValue) + number(item.cvTerminalBonus) + number(item.cvReversionaryBonus), item.cvCurrency);
      });
      result.guaranteed += policyGuaranteed;
      result.nonGuaranteed += policyNonGuaranteed;
      if (policyGuaranteed || policyNonGuaranteed) result.sources.values.push({ policyId: policy.policyId, label: policyLabel(policy), guaranteed: policyGuaranteed, nonGuaranteed: policyNonGuaranteed });
      if ((policy.items || []).some(item => String(item.category || '').includes('醫療'))) result.sources.medical.push({ policyId: policy.policyId, label: policyLabel(policy) });
    });
    result.medical = result.sources.medical.length;
    return result;
  }

  function policyLabel(policy) { return [policy.insurer, policy.items && policy.items[0] && policy.items[0].name].filter(Boolean).join(' · ') || '未命名保單'; }
  function source(policy, item, amount) { return { policyId: policy.policyId, benefitId: item.benefitId, label: policyLabel(policy), amount }; }

  function resolveFlow(defaultFlow, cloudFlow, overrides) {
    const byId = new Map();
    (defaultFlow || []).forEach(step => byId.set(step.step_id, clone(step)));
    (cloudFlow || []).forEach(step => byId.set(step.step_id, { ...(byId.get(step.step_id) || {}), ...clone(step) }));
    (overrides || []).forEach(step => byId.set(step.step_id || step.stepId, { ...(byId.get(step.step_id || step.stepId) || {}), ...clone(step), source: 'user' }));
    return Array.from(byId.values()).filter(step => step.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  function normalizeExtractedPolicy(raw, fileRefs) {
    const policyId = id('draft_policy');
    const rawBenefits = raw.benefits || raw.items || [raw];
    return {
      draftId: id('draft'), policyId, status: 'needs_confirmation', fileRefs: clone(fileRefs || []),
      insurer: raw.insurer || '', type: raw.policyType || raw.category || '其他', productName: raw.productName || raw.planName || '',
      policyHolder: raw.policyHolder || '', insuredPerson: raw.insuredPerson || '', policyNumber: raw.policyNumber || '',
      commencementDate: raw.commencementDate || raw.effectiveDate || '', currency: raw.currency || 'HKD',
      premium: raw.premium && typeof raw.premium === 'object' ? clone(raw.premium) : { amount: raw.premium || '', currency: raw.currency || 'HKD' }, payMode: raw.payMode || raw.paymentMode || '', premiumTerm: raw.premiumTerm || raw.paymentTerm || '', coverageTerm: raw.coverageTerm || raw.term || '',
      benefits: rawBenefits.map((item, index) => ({
        benefitId: id('draft_benefit'), category: item.category || raw.category || '其他', name: item.name || raw.productName || '',
        sumAssured: item.sumAssured || raw.sumAssured || null, deductible: item.deductible || null, roomLevel: item.roomLevel || '', majorLimit: item.majorLimit || null, sortOrder: index
      })),
      policyValues: raw.policyValues || {
        guaranteed: raw.cvGuaranteed || null,
        nonGuaranteed: raw.cvNonGuaranteed || raw.cvAnnualBonus || null,
        currency: raw.cvCurrency || raw.currency || 'HKD'
      },
      warnings: clone(raw.warnings || [])
    };
  }

  function groupExtractionResults(results) {
    const groups = [];
    (results || []).forEach(result => {
      const key = [result.data && result.data.policyNumber, result.data && (result.data.insuredPerson || result.data.policyHolder), result.data && result.data.productName].filter(Boolean).join('|');
      let group = key && groups.find(item => item.key === key);
      if (!group) { group = { groupId: id('group'), key: key || id('uncertain'), files: [], pages: [], status: key ? 'grouped' : 'uncertain', warnings: [] }; groups.push(group); }
      group.files.push(result.fileRef);
      group.pages.push(result.data || {});
      if (result.warning) group.warnings.push(result.warning);
    });
    return groups.map(group => {
      const merged = Object.assign({}, ...group.pages);
      const conflicts = [];
      ['policyNumber', 'insurer', 'productName', 'insuredPerson', 'premium'].forEach(field => {
        const values = [...new Set(group.pages.map(page => JSON.stringify(page[field])).filter(value => value && value !== 'undefined'))];
        if (values.length > 1) conflicts.push(field);
      });
      const draft = normalizeExtractedPolicy({ ...merged, warnings: conflicts.map(field => `資料有矛盾：${field}`) }, group.files);
      return { ...group, draft, status: conflicts.length || group.status === 'uncertain' ? 'needs_confirmation' : 'ready' };
    });
  }

  async function exportBackup() {
    const data = {};
    for (const store of STORES.filter(name => name !== 'ClientShares')) data[store] = await getAll(store);
    return { format: 'AVA-CRM-Backup', backupVersion: BACKUP_VERSION, databaseVersion: DB_VERSION, exportedAt: new Date().toISOString(), data };
  }

  function validateBackup(payload) {
    if (!payload || payload.format !== 'AVA-CRM-Backup' || !payload.data) throw new Error('不是有效的 AVA CRM 備份檔');
    if (payload.backupVersion > BACKUP_VERSION) throw new Error('備份版本較新，請先更新 CRM');
    STORES.filter(name => name !== 'ClientShares').forEach(store => {
      if (!Array.isArray(payload.data[store])) payload.data[store] = [];
    });
    return payload;
  }

  async function restoreBackup(payload) {
    const valid = validateBackup(clone(payload));
    for (const store of STORES.filter(name => name !== 'ClientShares')) await replaceStore(store, valid.data[store]);
    await put('Metadata', { key: 'lastRestore', value: new Date().toISOString(), backupVersion: valid.backupVersion });
  }

  async function createClientShare(client, ttlHours) {
    const summary = aggregateCoverage(client);
    const token = cryptoRandom(24);
    const expiresAt = new Date(Date.now() + (ttlHours || 24) * 3600000).toISOString();
    const snapshot = {
      token, clientId: client.clientId || client.id, owner: client.owner, updatedAt: client.updatedAt || new Date().toISOString(), expiresAt,
      summary, sources: summary.sources
    };
    await put('ClientShares', snapshot);
    return snapshot;
  }

  async function getClientShare(token) {
    const records = await getAll('ClientShares');
    const record = records.find(item => item.token === token);
    if (!record || Date.parse(record.expiresAt) < Date.now()) return null;
    return record;
  }

  root.AVACRM = Object.freeze({
    DB_NAME, DB_VERSION, BACKUP_VERSION, STORES, id, number, hkd, normalizeClient, normalizeClients,
    openDatabase, getAll, put, remove, replaceStore, saveClientGraph, loadClients, deleteClient, migrateLegacy,
    aggregateCoverage, resolveFlow, normalizeExtractedPolicy, groupExtractionResults, exportBackup, validateBackup,
    restoreBackup, createClientShare, getClientShare
  });
})(typeof window !== 'undefined' ? window : globalThis);
